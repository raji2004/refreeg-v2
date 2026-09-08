"use server";

import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  fullName: string;
  username: string | null;
  profilePhoto: string | null;
  referralCode: string | null;
  totalAmountDonated: number;
  successfulReferrals: number;
  firstReferralAt: string | null;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CurrentUserRankResult {
  rank: number | null;
  totalAmountDonated: number;
  referralCount: number;
}

export interface ReferrerDonorDetail {
  id: string;
  donorName: string;
  amount: number;
  isAnonymous: boolean;
  createdAt: string;
  cause: {
    id: string;
    title: string;
    slug: string | null;
  };
}

export interface ReferrerDonorDetailResult {
  referrer: {
    id: string;
    fullName: string;
    username: string | null;
    profilePhoto: string | null;
    referralCode: string | null;
    totalAmountDonated: number;
    totalReferrals: number;
  };
  donations: ReferrerDonorDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Returns paginated leaderboard entries sorted by total amount donated DESC,
 * with tie-breaking by earliest referral timestamp (min createdAt).
 */
export async function getLeaderboard(params?: {
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardResult> {
  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize || 20));
  const offset = (page - 1) * pageSize;

  try {
    // 1. Aggregate donations per referrer (filtered by confirmed status)
    const grouped = await (prisma as any).donation.groupBy({
      by: ["referrer_id"],
      where: {
        referrer_id: { not: null },
        status: "completed",
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      _min: {
        createdAt: true,
      },
      orderBy: [
        {
          _sum: {
            amount: "desc",
          },
        },
        {
          _min: {
            createdAt: "asc",
          },
        },
      ],
      skip: offset,
      take: pageSize,
    });

    const totalDistinctReferrers = await (
      prisma as any
    ).donation.groupBy({
      by: ["referrer_id"],
      where: {
        referrer_id: { not: null },
        status: "completed",
      },
    });

    const totalCount = totalDistinctReferrers.length;

    if (grouped.length === 0) {
      return {
        entries: [],
        totalCount,
        page,
        pageSize,
      };
    }

    // 2. Fetch user profile data for all referrers in this page
    const referrerIds = grouped.map((g: any) => g.referrer_id);
    const users = await prisma.user.findMany({
      where: {
        id: { in: referrerIds },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        profilePhoto: true,
        referralCode: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 3. Assemble ranked entries
    const entries: LeaderboardEntry[] = grouped.map(
      (g: any, index: number) => {
        const user = userMap.get(g.referrer_id);
        const rank = offset + index + 1;
        const totalAmount = Number(g._sum.amount || 0);

        return {
          rank,
          id: g.referrer_id,
          fullName: user?.fullName || user?.username || "Anonymous Referrer",
          username: user?.username || null,
          profilePhoto: user?.profilePhoto || null,
          referralCode: user?.referralCode || null,
          totalAmountDonated: totalAmount,
          successfulReferrals: g._count.id,
          firstReferralAt: g._min.createdAt
            ? new Date(g._min.createdAt).toISOString()
            : null,
        };
      },
    );

    return {
      entries,
      totalCount,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getLeaderboard] Error fetching leaderboard:", error);
    return {
      entries: [],
      totalCount: 0,
      page,
      pageSize,
    };
  }
}

/**
 * Returns rank, total amount donated, and referral count for a specific user ID.
 */
export async function getCurrentUserRank(
  userId: string,
): Promise<CurrentUserRankResult> {
  if (!userId) return { rank: null, totalAmountDonated: 0, referralCount: 0 };

  try {
    const allReferrers = await (
      prisma as any
    ).donation.groupBy({
      by: ["referrer_id"],
      where: {
        referrer_id: { not: null },
        status: "completed",
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      _min: {
        createdAt: true,
      },
      orderBy: [
        {
          _sum: {
            amount: "desc",
          },
        },
        {
          _min: {
            createdAt: "asc",
          },
        },
      ],
    });

    const index = allReferrers.findIndex(
      (r: any) => r.referrer_id === userId,
    );

    if (index === -1) {
      return { rank: null, totalAmountDonated: 0, referralCount: 0 };
    }

    return {
      rank: index + 1,
      totalAmountDonated: Number(allReferrers[index]._sum.amount || 0),
      referralCount: allReferrers[index]._count.id,
    };
  } catch (error) {
    console.error("[getCurrentUserRank] Error getting user rank:", error);
    return { rank: null, totalAmountDonated: 0, referralCount: 0 };
  }
}

/**
 * Returns referrer profile and paginated list of referred donations (with amount and anonymous protections).
 */
export async function getReferrerDonorDetail(
  referrerId: string,
  params?: { page?: number; pageSize?: number },
): Promise<ReferrerDonorDetailResult | null> {
  if (!referrerId) return null;

  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.max(1, Math.min(50, params?.pageSize || 20));
  const offset = (page - 1) * pageSize;

  try {
    const user = await prisma.user.findUnique({
      where: { id: referrerId },
      select: {
        id: true,
        fullName: true,
        username: true,
        profilePhoto: true,
        referralCode: true,
      },
    });

    if (!user) return null;

    const [totalCount, amountAgg, donations] = await Promise.all([
      (prisma as any).donation.count({
        where: {
          referrer_id: referrerId,
          status: "completed",
        },
      }),
      (prisma as any).donation.aggregate({
        where: {
          referrer_id: referrerId,
          status: "completed",
        },
        _sum: {
          amount: true,
        },
      }),
      (prisma as any).donation.findMany({
        where: {
          referrer_id: referrerId,
          status: "completed",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          amount: true,
          name: true,
          is_anonymous: true,
          createdAt: true,
          cause: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        skip: offset,
        take: pageSize,
      }),
    ]);

    const totalAmount = Number(amountAgg._sum?.amount || 0);

    const details: ReferrerDonorDetail[] = donations.map((d: any) => {
      const isAnonymous = Boolean(d.is_anonymous);
      const donorName = isAnonymous
        ? "Anonymous Donor"
        : d.name || "Generous Donor";

      return {
        id: d.id,
        donorName,
        amount: Number(d.amount || 0),
        isAnonymous,
        createdAt: d.createdAt
          ? new Date(d.createdAt).toISOString()
          : new Date().toISOString(),
        cause: {
          id: d.cause?.id || "",
          title: d.cause?.title || "Community Cause",
          slug: d.cause?.slug || null,
        },
      };
    });

    return {
      referrer: {
        id: user.id,
        fullName: user.fullName || user.username || "Referrer",
        username: user.username || null,
        profilePhoto: user.profilePhoto || null,
        referralCode: user.referralCode || null,
        totalAmountDonated: totalAmount,
        totalReferrals: totalCount,
      },
      donations: details,
      totalCount,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getReferrerDonorDetail] Error fetching details:", error);
    return null;
  }
}
