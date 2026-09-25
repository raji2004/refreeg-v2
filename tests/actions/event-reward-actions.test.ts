/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    events: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    rewardTransaction: {
      create: jest.fn(),
    },
    userWallet: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userStreak: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/event-bus", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  recordEvent,
  addRewards,
  getUserWallet,
  getUserStats,
  updateUserStreaks,
} from "@/actions/event-reward-actions";

const mockPrisma = prisma as unknown as {
  events: { findFirst: jest.Mock; create: jest.Mock };
  rewardTransaction: { create: jest.Mock };
  userWallet: { findUnique: jest.Mock; upsert: jest.Mock };
  userStreak: { findUnique: jest.Mock; upsert: jest.Mock };
};

describe("event-reward-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateUserStreaks", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2026-03-10T15:30:00Z"));
      mockPrisma.userStreak.upsert.mockImplementation(async ({ create }) => ({
        ...create,
      }));
      mockPrisma.events.create.mockResolvedValue({ id: "event-1" });
      mockPrisma.rewardTransaction.create.mockResolvedValue({ id: "r-1" });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 0 });
      mockPrisma.userWallet.upsert.mockResolvedValue({ balance: 0 });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("stores today's UTC date and starts a streak for a first-time user", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue(null);

      await updateUserStreaks("user-1");

      const args = mockPrisma.userStreak.upsert.mock.calls[0][0];
      expect(args.create.weeklyStreak).toBe(1);
      expect(args.create.lastActiveDate).toEqual(
        new Date("2026-03-10T00:00:00Z"),
      );
      expect(args.update.lastActiveDate).toEqual(
        new Date("2026-03-10T00:00:00Z"),
      );
    });

    it("extends the streak when the last active day was yesterday (UTC)", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue({
        weeklyStreak: 2,
        isMonthlyActive: true,
        lastActiveDate: new Date("2026-03-09T00:00:00Z"),
      });

      await updateUserStreaks("user-1");

      expect(
        mockPrisma.userStreak.upsert.mock.calls[0][0].update.weeklyStreak,
      ).toBe(3);
    });

    it("resets the streak after a missed day", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue({
        weeklyStreak: 5,
        isMonthlyActive: true,
        lastActiveDate: new Date("2026-03-07T00:00:00Z"),
      });

      await updateUserStreaks("user-1");

      expect(
        mockPrisma.userStreak.upsert.mock.calls[0][0].update.weeklyStreak,
      ).toBe(1);
    });

    it("records a monthly_active event with the UTC month when a new month starts", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue({
        weeklyStreak: 1,
        isMonthlyActive: false,
        lastActiveDate: new Date("2026-02-27T00:00:00Z"),
      });

      await updateUserStreaks("user-1");

      expect(mockPrisma.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_type: "monthly_active",
            metadata: { month: 3, year: 2026 },
          }),
        }),
      );
    });
  });

  describe("recordEvent", () => {
    it("creates comment event and awards rewards", async () => {
      const eventRecord = {
        id: "event-1",
        user_id: "user-1",
        event_type: "comment",
        metadata: {},
        created_at: new Date(),
      };
      mockPrisma.events.create.mockResolvedValue(eventRecord);
      mockPrisma.rewardTransaction.create.mockResolvedValue({ id: "reward-1" });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 100 });
      mockPrisma.userWallet.upsert.mockResolvedValue({ balance: 150 });

      const result = await recordEvent({
        type: "comment",
        userId: "user-1",
        metadata: { cause_id: "cause-1" },
      });

      expect(result).toEqual(eventRecord);
      expect(mockPrisma.rewardTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            amount: 50,
            transactionType: "comment",
          }),
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("skips duplicate login reward within 24 hours", async () => {
      const recentLogin = {
        id: "login-1",
        created_at: new Date(),
      };
      mockPrisma.events.findFirst.mockResolvedValue(recentLogin);

      const result = await recordEvent({
        type: "login",
        userId: "user-1",
      });

      expect(result).toEqual(recentLogin);
      expect(mockPrisma.events.create).not.toHaveBeenCalled();
    });

    it("calculates donation reward from amount", async () => {
      mockPrisma.events.create.mockResolvedValue({
        id: "event-2",
        user_id: "user-1",
        event_type: "donation",
      });
      mockPrisma.rewardTransaction.create.mockResolvedValue({ id: "reward-2" });
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);
      mockPrisma.userWallet.upsert.mockResolvedValue({ balance: 1000 });

      await recordEvent({
        type: "donation",
        userId: "user-1",
        amount: 10000,
      });

      expect(mockPrisma.rewardTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 1000 }),
        }),
      );
    });
  });

  describe("addRewards", () => {
    it("creates reward transaction and upserts wallet balance", async () => {
      mockPrisma.rewardTransaction.create.mockResolvedValue({ id: "reward-1" });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 200 });
      mockPrisma.userWallet.upsert.mockResolvedValue({ balance: 300 });

      const result = await addRewards("user-1", 100, "share", "event-1");

      expect(result.id).toBe("reward-1");
      expect(mockPrisma.userWallet.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          update: { balance: 300 },
        }),
      );
    });
  });

  describe("getUserWallet", () => {
    it("returns wallet and recent transactions", async () => {
      const wallet = { userId: "user-1", balance: 500 };
      const transactions = [{ id: "tx-1", amount: 50 }];
      mockPrisma.userWallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.rewardTransaction.findMany = jest
        .fn()
        .mockResolvedValue(transactions);

      const result = await getUserWallet("user-1");

      expect(result.wallet).toEqual(wallet);
      expect(result.transactions).toEqual(transactions);
      expect(result.walletError).toBeNull();
    });
  });

  describe("getUserStats", () => {
    it("returns streak data when present", async () => {
      const streak = {
        userId: "user-1",
        weeklyStreak: 3,
        isMonthlyActive: true,
        lastActiveDate: new Date("2026-01-01"),
      };
      mockPrisma.userStreak.findUnique.mockResolvedValue(streak);

      const result = await getUserStats("user-1");

      expect(result).toEqual(streak);
    });

    it("returns default stats when no streak record exists", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue(null);

      const result = await getUserStats("user-1");

      expect(result).toEqual({
        userId: "user-1",
        weeklyStreak: 0,
        isMonthlyActive: false,
        lastActiveDate: null,
      });
    });
  });
});
