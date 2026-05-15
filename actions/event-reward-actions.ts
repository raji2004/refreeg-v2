"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  calculateBaseReward,
  EIZA_MONTHLY_ACTIVE_DAYS,
  getRewardRule,
  roundEiza,
} from "@/lib/reward-constants";
import type { RewardEvent } from "@/types";

/**
 * Record an event and calculate rewards
 */
export async function recordEvent(event: RewardEvent) {
  try {
    const rewardRule = getRewardRule(event.type);

    if (rewardRule?.cooldownMs) {
      const recentReward = await prisma.rewardTransaction.findFirst({
        where: {
          userId: event.userId,
          transactionType: event.type,
          createdAt: {
            gte: new Date(Date.now() - rewardRule.cooldownMs),
          },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (recentReward) {
        return null;
      }
    }

    // Insert event into events table
    const eventData = await prisma.events.create({
      data: {
        user_id: event.userId,
        event_type: event.type,
        metadata: event.metadata || {},
      },
    });

    const rewardAmount = await calculateEligibleRewardAmount(event);

    if (rewardAmount > 0) {
      await addRewards(event.userId, rewardAmount, event.type, eventData.id);
    }

    return eventData;
  } catch (error) {
    console.error("Error in recordEvent:", error);
    throw error;
  }
}

/**
 * Add rewards to user's wallet
 */
export async function addRewards(
  userId: string,
  amount: number,
  eventType: string,
  eventId: string
) {
  try {
    // Insert reward transaction
    const rewardData = await prisma.rewardTransaction.create({
      data: {
        userId,
        amount,
        transactionType: eventType,
        event_id: eventId,
        status: "completed",
      },
    });

    // Update user's wallet balance using upsert
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
      select: { balance: true },
    });

    const currentBalance = Number(wallet?.balance || 0);
    const newBalance = roundEiza(currentBalance + amount);

    await prisma.userWallet.upsert({
      where: { userId },
      update: { balance: newBalance },
      create: { userId, balance: newBalance },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/wallet`);

    return rewardData;
  } catch (error) {
    console.error("Error in addRewards:", error);
    throw error;
  }
}

async function calculateEligibleRewardAmount(event: RewardEvent) {
  const baseReward = calculateBaseReward(event.type, event.amount);
  if (baseReward <= 0) return 0;

  const [multiplier, earnedToday] = await Promise.all([
    getEngagementQualityMultiplier(event.userId),
    getRewardsEarnedToday(event.userId, event.type),
  ]);

  if (multiplier <= 0) return 0;

  const adjustedReward = roundEiza(baseReward * multiplier);
  const rewardRule = getRewardRule(event.type);

  if (!rewardRule?.dailyCap) {
    return adjustedReward;
  }

  const remainingDailyCap = Math.max(0, rewardRule.dailyCap - earnedToday);
  return roundEiza(Math.min(adjustedReward, remainingDailyCap));
}

async function getRewardsEarnedToday(userId: string, transactionType: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rewards = await prisma.rewardTransaction.aggregate({
    where: {
      userId,
      transactionType,
      status: "completed",
      createdAt: {
        gte: startOfDay,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return Number(rewards._sum.amount ?? 0);
}

async function getEngagementQualityMultiplier(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      isBlocked: true,
      isVerified: true,
      content_quality_score: true,
      spam_flags: true,
      upvotes_received: true,
    },
  });

  if (!user || user.isBlocked) return 0;

  const spamFlags = user.spam_flags ?? 0;
  if (spamFlags >= 3) return 0;

  const accountAgeDays =
    (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  const rawQualityScore =
    user.content_quality_score === null || user.content_quality_score === undefined
      ? null
      : Number(user.content_quality_score);
  const qualityScore =
    rawQualityScore !== null && rawQualityScore > 1
      ? rawQualityScore / 100
      : rawQualityScore;

  let multiplier = 1;

  if (spamFlags > 0 || (qualityScore !== null && qualityScore < 0.5)) {
    multiplier = 0.5;
  } else if (
    accountAgeDays >= 90 &&
    user.isVerified &&
    (qualityScore ?? 0) >= 0.8 &&
    (user.upvotes_received ?? 0) >= 50
  ) {
    multiplier = 2;
  } else if (accountAgeDays >= 30 && (qualityScore ?? 0) >= 0.8) {
    multiplier = 1.5;
  }

  if (accountAgeDays < 7) {
    return Math.min(multiplier, 0.5);
  }

  return multiplier;
}

/**
 * Get user's wallet balance and recent transactions
 */
export async function getUserWallet(userId: string) {
  try {
    const [wallet, transactions] = await Promise.all([
      prisma.userWallet.findUnique({
        where: { userId },
      }),
      prisma.rewardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      wallet: wallet
        ? {
            id: wallet.id,
            user_id: wallet.userId,
            balance: Number(wallet.balance ?? 0),
            created_at: wallet.createdAt?.toISOString() ?? null,
            updated_at: wallet.updatedAt?.toISOString() ?? null,
          }
        : null,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        user_id: transaction.userId,
        amount: Number(transaction.amount),
        transaction_type: transaction.transactionType,
        event_id: transaction.event_id ?? null,
        status: transaction.status ?? "completed",
        created_at: transaction.createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: transaction.updatedAt?.toISOString() ?? null,
      })),
      walletError: null,
      transactionsError: null,
    };
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    throw error;
  }
}

/**
 * Update user streaks (weekly and monthly active)
 */
export async function updateUserStreaks(userId: string) {
  try {
    // Get current streak data
    const streakData = await prisma.userStreak.findUnique({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = streakData?.lastActiveDate
      ? new Date(streakData.lastActiveDate)
      : null;
    lastActive?.setHours(0, 0, 0, 0);

    let weeklyStreak = streakData?.weeklyStreak || 0;

    // Check if this is a new day
    if (!lastActive || lastActive.getTime() !== today.getTime()) {
      // Check if streak continues (yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastActive && lastActive.getTime() === yesterday.getTime()) {
        weeklyStreak += 1;
      } else {
        weeklyStreak = 1;
      }
    }

    const month = today.getMonth();
    const year = today.getFullYear();
    const monthStart = new Date(year, month, 1);
    const nextMonthStart = new Date(year, month + 1, 1);
    const activeDaysThisMonth = await getActiveDaysInPeriod(
      userId,
      monthStart,
      nextMonthStart,
    );
    const isMonthlyActive = activeDaysThisMonth >= EIZA_MONTHLY_ACTIVE_DAYS;

    // Update streak data
    const updatedStreak = await prisma.userStreak.upsert({
      where: { userId },
      update: {
        weeklyStreak,
        isMonthlyActive,
        lastActiveDate: today,
      },
      create: {
        userId,
        weeklyStreak,
        isMonthlyActive,
        lastActiveDate: today,
      },
    });

    // Award rewards if milestones reached
    const hasWeeklyMilestone =
      weeklyStreak > 0 && weeklyStreak % 7 === 0 && streakData?.weeklyStreak !== weeklyStreak;
    const monthlyRewardThisPeriod = isMonthlyActive
      ? await prisma.rewardTransaction.findFirst({
          where: {
            userId,
            transactionType: "monthly_active",
            createdAt: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          select: { id: true },
        })
      : null;
    const hasMonthlyMilestone =
      isMonthlyActive && !monthlyRewardThisPeriod;

    if (hasWeeklyMilestone) {
      await recordEvent({
        type: "weekly_streak",
        userId,
        metadata: { streak: weeklyStreak },
      });
      // Emit SSE event
      try {
        const { eventBus } = await import("@/lib/event-bus");
        eventBus.emit("weekly_streak", {
          type: "weekly_streak",
          data: updatedStreak,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Error emitting weekly_streak SSE:", e);
      }
    }

    if (hasMonthlyMilestone) {
      await recordEvent({
        type: "monthly_active",
        userId,
        metadata: {
          active_days: activeDaysThisMonth,
          month: today.getMonth() + 1,
          year,
        },
      });
      // Emit SSE event
      try {
        const { eventBus } = await import("@/lib/event-bus");
        eventBus.emit("monthly_active", {
          type: "monthly_active",
          data: updatedStreak,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Error emitting monthly_active SSE:", e);
      }
    }

    revalidatePath("/dashboard");

    return updatedStreak;
  } catch (error) {
    console.error("Error in updateUserStreaks:", error);
    throw error;
  }
}

async function getActiveDaysInPeriod(userId: string, start: Date, end: Date) {
  const loginEvents = await prisma.events.findMany({
    where: {
      user_id: userId,
      event_type: "login",
      created_at: {
        gte: start,
        lt: end,
      },
    },
    select: {
      created_at: true,
    },
  });

  const activeDays = new Set(
    loginEvents
      .filter((event) => event.created_at)
      .map((event) => new Date(event.created_at!).toISOString().slice(0, 10)),
  );

  return activeDays.size;
}

/**
 * Get user's streak and activity stats
 */
export async function getUserStats(userId: string) {
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const [data, activeDaysThisMonth, qualityMultiplier] = await Promise.all([
      prisma.userStreak.findUnique({
        where: { userId },
      }),
      getActiveDaysInPeriod(userId, monthStart, nextMonthStart),
      getEngagementQualityMultiplier(userId),
    ]);

    return data
      ? {
          id: data.id,
          user_id: data.userId,
          weekly_streak: data.weeklyStreak ?? 0,
          is_monthly_active: data.isMonthlyActive ?? false,
          last_active_date: data.lastActiveDate?.toISOString() ?? null,
          active_days_this_month: activeDaysThisMonth,
          quality_multiplier: qualityMultiplier,
          created_at: data.createdAt?.toISOString() ?? null,
          updated_at: data.updatedAt?.toISOString() ?? null,
        }
      : {
          user_id: userId,
          weekly_streak: 0,
          is_monthly_active: false,
          last_active_date: null,
          active_days_this_month: activeDaysThisMonth,
          quality_multiplier: qualityMultiplier,
        };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    throw error;
  }
}
