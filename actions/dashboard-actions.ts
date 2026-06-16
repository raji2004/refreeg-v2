import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDashboardStats(userId: string) {
  try {
    const causes = await prisma.cause.findMany({
      where: { userId, status: "approved" },
      select: { id: true },
    });

    if (!causes || causes.length === 0) {
      return { totalRaised: formatCurrency(0), totalDonors: 0, activeCauses: 0 };
    }

    const causeIds = causes.map((c) => c.id);

    const agg = await prisma.donation.aggregate({
      _sum: { amount: true },
      where: { causeId: { in: causeIds } },
    });

    const donations = await prisma.donation.findMany({
      where: { causeId: { in: causeIds }, userId: { not: null } },
      select: { userId: true },
    });

    const totalRaised = Number(agg._sum.amount || 0);
    const totalDonors = new Set(donations.map((d) => d.userId)).size;

    return {
      totalRaised: formatCurrency(totalRaised),
      totalDonors,
      activeCauses: causes.length,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { totalRaised: formatCurrency(0), totalDonors: 0, activeCauses: 0 };
  }
}

export async function getDonationTrends(userId: string) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const causes = await prisma.cause.findMany({
      where: { userId, status: "approved" },
      select: { id: true },
    });

    if (!causes || causes.length === 0) return [];

    const causeIds = causes.map((cause) => cause.id);

    const donations = await prisma.donation.findMany({
      where: {
        causeId: { in: causeIds },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const monthlyDonations = donations.reduce((acc, donation) => {
      if (!donation.createdAt) return acc;
      const date = new Date(donation.createdAt);
      const month = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += Number(donation.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyDonations).map(([month, amount]) => ({
      month,
      amount,
    }));
  } catch (error) {
    console.error("Error fetching donation trends:", error);
    return [];
  }
}

export async function getUserCauses(userId: string, status?: string) {
  try {
    const whereClause: any = { userId };
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const causes = await prisma.cause.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return causes;
  } catch (error) {
    console.error("Error fetching user causes:", error);
    return [];
  }
}

export async function getUserCausesWithStats(userId: string) {
  try {
    const causes = await prisma.cause.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!causes || causes.length === 0) return [];

    const causeIds = causes.map((c) => c.id);

    const aggregatedDonations = await prisma.donation.groupBy({
      by: ["causeId"],
      _sum: { amount: true },
      where: { causeId: { in: causeIds } },
    });

    const raisedByCause: Record<string, number> = {};
    for (const d of aggregatedDonations) {
      raisedByCause[d.causeId] = Number(d._sum.amount || 0);
    }

    return causes.map((cause) => ({
      ...cause,
      raised: raisedByCause[cause.id] || 0,
    }));
  } catch (error) {
    console.error("Error fetching user causes with stats:", error);
    return [];
  }
}

export async function getUserPetitionsWithStats(userId: string) {
  try {
    const petitions = await prisma.petitions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    if (!petitions || petitions.length === 0) return [];

    const petitionIds = petitions.map((p) => p.id);

    const aggregatedSignatures = await prisma.signatures.groupBy({
      by: ["petition_id"],
      _count: { petition_id: true },
      where: { petition_id: { in: petitionIds } },
    });

    const countByPetition: Record<string, number> = {};
    for (const s of aggregatedSignatures) {
      countByPetition[s.petition_id] = s._count.petition_id;
    }

    return petitions.map((petition) => ({
      ...petition,
      signatures: countByPetition[petition.id] || 0,
    }));
  } catch (error) {
    console.error("Error fetching user petitions with stats:", error);
    return [];
  }
}

export async function getCauseAnalytics(causeId: string) {
  if (!UUID_REGEX.test(causeId)) return null;

  try {
    const donations = await prisma.donation.findMany({
      where: { causeId },
      select: { amount: true, createdAt: true, message: true, userId: true },
    });

    const totalDonations = donations.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0
    );
    const uniqueDonors = new Set(
      donations.map((d) => d.userId).filter(Boolean)
    ).size;
    const averageDonation = uniqueDonors > 0 ? totalDonations / uniqueDonors : 0;

    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      select: { goal: true, shared: true, createdAt: true },
    });

    if (!cause) return null;

    const goalNum = Number(cause.goal || 0);
    const sharedNum = Number(cause.shared || 0);

    const completionPercentage =
      goalNum > 0 ? (totalDonations / goalNum) * 100 : 0;

    let daysActive = 0;
    if (cause.createdAt) {
      daysActive = Math.ceil(
        (new Date().getTime() - new Date(cause.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyDonations = donations
      .filter((d) => d.createdAt && new Date(d.createdAt) >= thirtyDaysAgo)
      .reduce((acc, donation) => {
        const date = new Date(donation.createdAt!).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += Number(donation.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    const dailyDonationsArray = Object.entries(dailyDonations).map(
      ([date, amount]) => ({
        date,
        amount,
      })
    );

    const engagement = {
      shares: sharedNum,
      comments: donations.filter((d) => d.message && d.message.trim() !== "")
        .length,
      views: 0,
      conversionRate: sharedNum > 0 ? (uniqueDonors / sharedNum) * 100 : 0,
    };

    return {
      overview: {
        totalDonations,
        totalDonors: uniqueDonors,
        averageDonation,
        completionPercentage,
        daysActive,
      },
      donations: {
        daily: dailyDonationsArray,
      },
      engagement,
      comments: donations
        .filter((d) => d.message && d.message.trim() !== "")
        .map((d) => ({
          message: d.message,
          date: d.createdAt?.toISOString() || "",
          donorId: d.userId,
        })),
    };
  } catch (error) {
    console.error("Error fetching cause analytics:", error);
    return null;
  }
}

export async function getPetitionDashboardStats(userId: string) {
  try {
    const petitions = await prisma.petitions.findMany({
      where: { user_id: userId, status: "approved" },
      select: { id: true },
    });

    if (!petitions || petitions.length === 0) {
      return {
        totalRaised: formatCurrency(0),
        totalDonors: 0,
        activePetitions: 0,
      };
    }

    const petitionIds = petitions.map((p) => p.id);

    const agg = await prisma.signatures.aggregate({
      _sum: { amount: true },
      where: { petition_id: { in: petitionIds } },
    });

    const signatures = await prisma.signatures.findMany({
      where: { petition_id: { in: petitionIds }, user_id: { not: null } },
      select: { user_id: true },
    });

    const totalRaised = Number(agg._sum.amount || 0);
    const totalDonors = new Set(signatures.map((s) => s.user_id)).size;

    return {
      totalRaised: formatCurrency(totalRaised),
      totalDonors,
      activePetitions: petitions.length,
    };
  } catch (error) {
    console.error("Error fetching petition dashboard stats:", error);
    return {
      totalRaised: formatCurrency(0),
      totalDonors: 0,
      activePetitions: 0,
    };
  }
}

export async function getPetitionSignatureTrends(userId: string) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const signatures = await prisma.signatures.findMany({
      where: {
        user_id: userId,
        created_at: { gte: sixMonthsAgo },
      },
      select: { amount: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    const monthlySignatures = signatures.reduce((acc, signature) => {
      if (!signature.created_at) return acc;
      const date = new Date(signature.created_at);
      const month = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += Number(signature.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlySignatures).map(([month, amount]) => ({
      month,
      amount,
    }));
  } catch (error) {
    console.error("Error fetching signature trends:", error);
    return [];
  }
}

export async function getUserPetitions(userId: string, status?: string) {
  try {
    const whereClause: any = { user_id: userId };
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const petitions = await prisma.petitions.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
    });

    return petitions;
  } catch (error) {
    console.error("Error fetching user petitions:", error);
    return [];
  }
}

export async function getPetitionAnalytics(petitionId: string) {
  if (!UUID_REGEX.test(petitionId)) return null;

  try {
    const signatures = await prisma.signatures.findMany({
      where: { petition_id: petitionId },
      select: { amount: true, created_at: true, message: true, user_id: true },
    });

    const totalSignatures = signatures.reduce(
      (sum, s) => sum + Number(s.amount || 0),
      0
    );
    const uniqueSigners = new Set(
      signatures.map((s) => s.user_id).filter(Boolean)
    ).size;
    const averageSignature =
      uniqueSigners > 0 ? totalSignatures / uniqueSigners : 0;

    const petition = await prisma.petitions.findUnique({
      where: { id: petitionId },
      select: { goal: true, shared: true, created_at: true },
    });

    if (!petition) return null;

    const goalNum = Number(petition.goal || 0);
    const sharedNum = Number(petition.shared || 0);

    const completionPercentage =
      goalNum > 0 ? (totalSignatures / goalNum) * 100 : 0;

    let daysActive = 0;
    if (petition.created_at) {
      daysActive = Math.ceil(
        (new Date().getTime() - new Date(petition.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySignatures = signatures
      .filter((d) => d.created_at && new Date(d.created_at) >= thirtyDaysAgo)
      .reduce((acc, signature) => {
        const date = new Date(signature.created_at!).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += Number(signature.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    const dailySignaturesArray = Object.entries(dailySignatures).map(
      ([date, amount]) => ({
        date,
        amount,
      })
    );

    const engagement = {
      shares: sharedNum,
      comments: signatures.filter((s) => s.message && s.message.trim() !== "")
        .length,
      views: 0,
      conversionRate:
        sharedNum > 0 ? (uniqueSigners / sharedNum) * 100 : 0,
    };

    return {
      overview: {
        totalSignatures,
        totalSigners: uniqueSigners,
        averageSignature,
        completionPercentage,
        daysActive,
      },
      signatures: {
        daily: dailySignaturesArray,
      },
      engagement,
      comments: signatures
        .filter((d) => d.message && d.message.trim() !== "")
        .map((d) => ({
          message: d.message,
          date: d.created_at?.toISOString() || "",
          donorId: d.user_id,
        })),
    };
  } catch (error) {
    console.error("Error fetching petition analytics:", error);
    return null;
  }
}

