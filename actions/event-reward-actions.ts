"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { REWARD_AMOUNTS } from "@/lib/reward-constants";
import type { RewardEvent } from "@/types";

/**
 * Record an event and calculate rewards
 */
export async function recordEvent(event: RewardEvent) {
  try {
    // Prevent multiple login rewards within a rolling 24-hour window
    if (event.type === "login") {
      try {
        const recentLogin = await prisma.events.findFirst({
          where: {
            user_id: event.userId,
            event_type: "login",
          },
          orderBy: { created_at: "desc" },
          select: { id: true, created_at: true },
        });

        if (recentLogin?.created_at) {
          const lastLogin = new Date(recentLogin.created_at).getTime();
          const now = Date.now();
          const hours24 = 24 * 60 * 60 * 1000;

          if (now - lastLogin < hours24) {
            // A login event already recorded within 24 hours — do not award again
            return recentLogin;
          }
        }
      } catch (err) {
        // If something goes wrong checking recent logins, log and continue to avoid breaking login flow
        console.error("Error while verifying daily login reward:", err);
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

    // Calculate rewards based on event type
    let rewardAmount = 0;
    switch (event.type) {
      case "comment":
        rewardAmount = REWARD_AMOUNTS.comment;
        break;
      case "share":
        rewardAmount = REWARD_AMOUNTS.share;
        break;
      case "donation":
        rewardAmount = event.amount ? REWARD_AMOUNTS.donation(event.amount) : 0;
        break;
      case "login":
        rewardAmount = REWARD_AMOUNTS.login;
        break;
      case "weekly_streak":
        rewardAmount = REWARD_AMOUNTS.weekly_streak;
        break;
      case "monthly_active":
        rewardAmount = REWARD_AMOUNTS.monthly_active;
        break;
    }

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
    const newBalance = currentBalance + amount;

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
      wallet,
      transactions,
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
    let isMonthlyActive = streakData?.isMonthlyActive || false;

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

    // Check if it's a new month
    const month = today.getMonth();
    const year = today.getFullYear();
    const streakMonth = lastActive ? lastActive.getMonth() : -1;
    const streakYear = lastActive ? lastActive.getFullYear() : -1;

    if (month !== streakMonth || year !== streakYear) {
      isMonthlyActive = true;
    }

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
    const hasMonthlyMilestone =
      isMonthlyActive && !streakData?.isMonthlyActive;

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
        metadata: { month: today.getMonth() + 1, year },
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

/**
 * Get user's streak and activity stats
 */
export async function getUserStats(userId: string) {
  try {
    const data = await prisma.userStreak.findUnique({
      where: { userId },
    });

    return data || {
      userId,
      weeklyStreak: 0,
      isMonthlyActive: false,
      lastActiveDate: null,
    };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    throw error;
  }
}
