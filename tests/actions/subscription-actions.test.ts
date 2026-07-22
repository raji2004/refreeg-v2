jest.mock("@/lib/prisma", () => ({
  prisma: {
    subscriptions: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createSubscription,
  updateSubscriptionStatus,
} from "@/actions/subscription-actions";

const mockPrisma = prisma as unknown as {
  subscriptions: {
    create: jest.Mock;
    updateMany: jest.Mock;
  };
};

describe("subscription-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createSubscription", () => {
    it("creates a subscription and revalidates the path", async () => {
      const subscription = {
        id: "sub-1",
        cause_id: "cause-1",
        status: "active",
      };
      mockPrisma.subscriptions.create.mockResolvedValue(subscription);

      const result = await createSubscription({
        cause_id: "cause-1",
        paystack_subscription_code: "SUB_123",
        amount: 5000,
        interval: "monthly",
      });

      expect(result).toEqual(subscription);
      expect(mockPrisma.subscriptions.create).toHaveBeenCalledWith({
        data: {
          user_id: null,
          cause_id: "cause-1",
          paystack_subscription_code: "SUB_123",
          paystack_email_token: undefined,
          amount: 5000,
          interval: "monthly",
          status: "active",
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/subscriptions");
    });

    it("throws when prisma create fails", async () => {
      mockPrisma.subscriptions.create.mockRejectedValue(
        new Error("db error"),
      );

      await expect(
        createSubscription({
          cause_id: "cause-1",
          paystack_subscription_code: "SUB_123",
          amount: 5000,
          interval: "monthly",
        }),
      ).rejects.toThrow("Failed to create subscription record");
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("updates subscription status and revalidates the path", async () => {
      mockPrisma.subscriptions.updateMany.mockResolvedValue({ count: 1 });

      await updateSubscriptionStatus("SUB_123", "cancelled");

      expect(mockPrisma.subscriptions.updateMany).toHaveBeenCalledWith({
        where: { paystack_subscription_code: "SUB_123" },
        data: { status: "cancelled" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/subscriptions");
    });

    it("throws when update fails", async () => {
      mockPrisma.subscriptions.updateMany.mockRejectedValue(
        new Error("db error"),
      );

      await expect(
        updateSubscriptionStatus("SUB_123", "cancelled"),
      ).rejects.toThrow("Failed to update subscription status");
    });
  });
});
