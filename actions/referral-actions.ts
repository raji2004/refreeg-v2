"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

type ReferralDashboardData = {
  referralLink: string;
  points: number;
  invites: number;
  signUps: number;
  tier: string;
  referrals: Array<{
    id: string;
    referrer_id?: string | null;
    referee_id?: string | null;
    registered: boolean | null;
    referee_email: string | null;
    created_at: string | null;
    reward?: string | null;
    profiles?: {
      first_name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
  }>;
};

export async function getReferralDashboardData(): Promise<ReferralDashboardData | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const [profile, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
      },
    }),
    prisma.referrals_v1.findMany({
      where: { referrer_id_v1: userId },
      orderBy: { created_at_v1: "desc" },
      select: {
        id_v1: true,
        referrer_id_v1: true,
        referee_id_v1: true,
        referee_email_v1: true,
        registered_v1: true,
        reward_v1: true,
        created_at_v1: true,
      },
    }),
  ]);

  const refereeIds = rows
    .map((row) => row.referee_id_v1)
    .filter((id): id is string => Boolean(id));

  const referredProfiles = refereeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: refereeIds } },
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      })
    : [];

  const profileMap = new Map(
    referredProfiles.map((referredProfile) => [
      referredProfile.id,
      {
        first_name: referredProfile.firstName ?? null,
        email: referredProfile.email ?? null,
        avatar_url: null,
      },
    ]),
  );

  const referrals = rows.map((row) => ({
    id: row.id_v1,
    referrer_id: row.referrer_id_v1,
    referee_id: row.referee_id_v1,
    registered: row.registered_v1,
    referee_email: row.referee_email_v1,
    created_at: row.created_at_v1?.toISOString() ?? null,
    reward: row.reward_v1,
    profiles: row.referee_id_v1 ? profileMap.get(row.referee_id_v1) ?? null : null,
  }));

  const signUps = referrals.filter((row) => row.registered).length;
  const points = signUps * 5;
  const referralCode = profile?.referralCode || userId;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL?.replace(/\/api\/auth$/, "") ||
    "";

  let tier = "Tier 1";
  if (points >= 505) {
    tier = "Tier 3";
  } else if (points >= 205) {
    tier = "Tier 2";
  }

  return {
    referralLink: `${baseUrl}/auth/signup?ref_v1=${referralCode}`,
    points,
    invites: referrals.length,
    signUps,
    tier,
    referrals,
  };
}
