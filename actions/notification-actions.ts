"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { causePublicPath } from "@/lib/causes/slug";

export type NotificationItem = {
  id: string;
  /** Rendered bold, followed by `text`. */
  emphasis?: string;
  text: string;
  href?: string;
  at: string;
  unread: boolean;
};

const CLOSING_SOON_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 15;

const REWARD_REASONS: Record<string, string> = {
  signup: "finishing setup",
  referral_bonus: "a referral",
  donation: "your donation",
  comment: "commenting on a campaign",
  share: "sharing a campaign",
  login: "logging in today",
  weekly_streak: "your weekly streak",
  monthly_active: "being active this month",
};

/**
 * The bell feed, built from what already happened: verification, EIZA
 * rewards, and saved campaigns about to close. Anything newer than the
 * user's last "Mark all read" counts as new.
 */
export async function getNotifications(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
} | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const now = new Date();
  const [profile, kyc, rewards, savedCauses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { notifications_read_at: true },
    }),
    prisma.kyc_verifications.findFirst({
      where: { user_id: user.id, status: "approved" },
      select: { id: true, updated_at: true, created_at: true },
      orderBy: { updated_at: "desc" },
    }),
    prisma.rewardTransaction.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        amount: true,
        transactionType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ITEMS,
    }),
    prisma.bookmarks.findMany({
      where: { user_id: user.id, target_type: "cause" },
      select: { target_id: true, created_at: true },
    }),
  ]);

  const closing = savedCauses.length
    ? await prisma.cause.findMany({
        where: {
          id: { in: savedCauses.map((b) => b.target_id) },
          status: "approved",
          end_date: {
            gt: now,
            lte: new Date(now.getTime() + CLOSING_SOON_DAYS * DAY_MS),
          },
        },
        select: { id: true, slug: true, title: true, end_date: true },
      })
    : [];
  const savedAt = new Map(savedCauses.map((b) => [b.target_id, b.created_at]));

  const readAt = profile?.notifications_read_at ?? null;
  const items: Omit<NotificationItem, "unread">[] = [];

  if (kyc) {
    items.push({
      id: `kyc-${kyc.id}`,
      text: "Your account is verified. You can give any amount.",
      href: "/dashboard/settings/kyc",
      at: (kyc.updated_at ?? kyc.created_at ?? now).toISOString(),
    });
  }

  for (const reward of rewards) {
    const reason = REWARD_REASONS[reward.transactionType];
    items.push({
      id: `reward-${reward.id}`,
      emphasis: `${Number(reward.amount).toLocaleString()} EIZA`,
      text: reason ? ` credited for ${reason}.` : " credited to your account.",
      at: (reward.createdAt ?? now).toISOString(),
    });
  }

  for (const cause of closing) {
    const end = cause.end_date!;
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - now.getTime()) / DAY_MS),
    );
    // It became news when it entered the closing window (or when it was
    // saved, if that was later).
    const windowStart = new Date(end.getTime() - CLOSING_SOON_DAYS * DAY_MS);
    const saved = savedAt.get(cause.id);
    const at = saved && saved > windowStart ? saved : windowStart;
    items.push({
      id: `closing-${cause.id}`,
      emphasis: cause.title,
      text: ` is ${days} ${days === 1 ? "day" : "days"} from closing.`,
      href: causePublicPath(cause),
      at: at.toISOString(),
    });
  }

  const sorted = items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ITEMS)
    .map((item) => ({
      ...item,
      unread: !readAt || new Date(item.at) > readAt,
    }));

  return {
    items: sorted,
    unreadCount: sorted.filter((i) => i.unread).length,
  };
}

/** "Mark all read": everything up to now stops counting as new. */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { notifications_read_at: new Date() },
  });
}
