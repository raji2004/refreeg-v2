jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pledges: {
      create: jest.fn(),
    },
    cause: {
      findUnique: jest.fn(),
    },
  },
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { createPledge } from "@/actions/pledge-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  pledges: { create: jest.Mock };
  cause: { findUnique: jest.Mock };
};

function futureDateIso(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

describe("pledge-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.cause.findUnique.mockResolvedValue({ paused: false });
  });

  describe("createPledge", () => {
    it("rejects reminder dates in the past", async () => {
      const result = await createPledge({
        causeId: "cause-1",
        amount: 1000,
        reminderDate: "2020-01-01",
        name: "Jane Doe",
        email: "jane@example.com",
      });

      expect(result).toEqual({
        data: null,
        error: "Reminder date cannot be in the past.",
      });
      expect(mockPrisma.pledges.create).not.toHaveBeenCalled();
    });

    it("rejects pledges for a paused campaign", async () => {
      mockPrisma.cause.findUnique.mockResolvedValue({ paused: true });

      const result = await createPledge({
        causeId: "cause-1",
        amount: 1000,
        reminderDate: futureDateIso(),
        name: "Jane Doe",
        email: "jane@example.com",
      });

      expect(result).toEqual({
        data: null,
        error: "This campaign is paused while its details are being updated.",
      });
      expect(mockPrisma.pledges.create).not.toHaveBeenCalled();
    });

    it("creates a pledge for an authenticated user", async () => {
      const pledge = { id: "pledge-1" };
      mockPrisma.pledges.create.mockResolvedValue(pledge);

      const result = await createPledge({
        causeId: "cause-1",
        amount: 1000,
        reminderDate: futureDateIso(),
        name: "Jane Doe",
        email: "jane@example.com",
        note: "Will donate soon",
      });

      expect(result).toEqual({ data: pledge, error: null });
      expect(mockPrisma.pledges.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cause_id: "cause-1",
          user_id: "user-1",
          amount: 1000,
          name: "Jane Doe",
          email: "jane@example.com",
          note: "Will donate soon",
          currency: "NGN",
          status: "pending",
          token: null,
          paystack_payment_status: "awaiting_authorization",
        }),
      });
    });

    it("creates a guest pledge with a token when unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const pledge = { id: "pledge-2" };
      mockPrisma.pledges.create.mockResolvedValue(pledge);

      const result = await createPledge({
        causeId: "cause-1",
        amount: 500,
        reminderDate: futureDateIso(),
        name: "Guest",
        email: "guest@example.com",
      });

      expect(result.error).toBeNull();
      expect(mockPrisma.pledges.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: null,
          token: expect.any(String),
        }),
      });
    });
  });
});
