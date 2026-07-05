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
