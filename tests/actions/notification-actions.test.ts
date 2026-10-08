/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    kyc_verifications: { findFirst: jest.fn() },
    rewardTransaction: { findMany: jest.fn() },
    bookmarks: { findMany: jest.fn() },
    cause: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/auth/session-user", () => ({ getSessionUser: jest.fn() }));

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import {
  getNotifications,
  markAllNotificationsRead,
} from "@/actions/notification-actions";

const db = prisma as any;
const NOW = new Date("2026-10-05T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function seed({
  readAt = null as Date | null,
  kyc = null as any,
  rewards = [] as any[],
  bookmarks = [] as any[],
  closing = [] as any[],
} = {}) {
  db.user.findUnique.mockResolvedValue({ notifications_read_at: readAt });
  db.kyc_verifications.findFirst.mockResolvedValue(kyc);
  db.rewardTransaction.findMany.mockResolvedValue(rewards);
  db.bookmarks.findMany.mockResolvedValue(bookmarks);
  db.cause.findMany.mockResolvedValue(closing);
}

describe("notification feed", () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(NOW));
  afterAll(() => jest.useRealTimers());
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionUser as jest.Mock).mockResolvedValue({ id: "user-1" });
  });

  it("returns null when signed out", async () => {
    (getSessionUser as jest.Mock).mockResolvedValue(null);
    await expect(getNotifications()).resolves.toBeNull();
  });

  it("builds verification and EIZA items, newest first, all unread", async () => {
    seed({
      kyc: { id: "k1", updated_at: minutesAgo(2), created_at: minutesAgo(10) },
      rewards: [
        {
          id: "r1",
          amount: 150,
          transactionType: "signup",
          createdAt: minutesAgo(3),
        },
      ],
    });

    const feed = await getNotifications();

    expect(feed?.items.map((i) => [i.emphasis ?? "", i.text])).toEqual([
      ["", "Your account is verified. You can give any amount."],
      ["150 EIZA", " credited for finishing setup."],
    ]);
    expect(feed?.unreadCount).toBe(2);
  });

  it("only counts items after the last mark-all-read as new", async () => {
    seed({
      readAt: minutesAgo(5),
      rewards: [
        {
          id: "new",
          amount: 50,
          transactionType: "donation",
          createdAt: minutesAgo(1),
        },
        {
          id: "old",
          amount: 25,
          transactionType: "share",
          createdAt: minutesAgo(30),
        },
      ],
    });

    const feed = await getNotifications();

    expect(feed?.items.map((i) => [i.id, i.unread])).toEqual([
      ["reward-new", true],
      ["reward-old", false],
    ]);
    expect(feed?.unreadCount).toBe(1);
  });

  it("flags saved campaigns that close within ten days", async () => {
    const end = new Date(NOW.getTime() + 9 * 24 * 60 * 60 * 1000);
    seed({
      bookmarks: [{ target_id: "c1", created_at: minutesAgo(60 * 24 * 30) }],
      closing: [
        {
          id: "c1",
          slug: "market-stalls",
          title: "Restock 600 market stalls",
          end_date: end,
        },
      ],
    });

    const feed = await getNotifications();

    expect(db.cause.findMany.mock.calls[0][0].where.id).toEqual({ in: ["c1"] });
    expect(feed?.items[0]).toMatchObject({
      emphasis: "Restock 600 market stalls",
      text: " is 9 days from closing.",
      href: "/causes/market-stalls",
    });
  });

  it("marks everything read up to now", async () => {
    await markAllNotificationsRead();
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { notifications_read_at: NOW },
    });
  });
});
