"use server";

import { auth } from "@/lib/auth/auth";
import {
  addRewardsCore,
  getUserStatsCore,
  getUserWalletCore,
  recordEventCore,
  updateUserStreaksCore,
} from "@/lib/reward-core";
import type { RewardEvent, RewardTransaction, UserStreak } from "@/types";

// Everything exported from a "use server" file is reachable as an
// unauthenticated RPC call with arbitrary arguments, so each wrapper derives
// the actor from the session and refuses to touch anyone else's wallet.
async function requireSelf(userId: string): Promise<string> {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    throw new Error("You need to be signed in.");
  }
  if (sessionUserId !== userId) {
    throw new Error("You can only access your own rewards.");
  }
  return sessionUserId;
}

export async function recordEvent(event: RewardEvent) {
  const sessionUserId = await requireSelf(event.userId);
  return recordEventCore({ ...event, userId: sessionUserId });
}

export async function addRewards(
  userId: string,
  amount: number,
  eventType: string,
  eventId: string,
) {
  await requireSelf(userId);
  return addRewardsCore(userId, amount, eventType, eventId);
}

export async function getUserWallet(userId: string) {
  await requireSelf(userId);
  return getUserWalletCore(userId);
}

export async function updateUserStreaks(userId: string) {
  await requireSelf(userId);
  return updateUserStreaksCore(userId);
}

export async function getUserStats(userId: string): Promise<UserStreak> {
  await requireSelf(userId);
  return getUserStatsCore(userId);
}
