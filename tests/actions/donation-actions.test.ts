/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    donation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    cause: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    pledges: {
      updateMany: jest.fn(),
    },
    campaign_follows: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/actions/event-reward-actions", () => ({
  recordEvent: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendDonationReceivedEmail: jest.fn(),
}));

jest.mock("@/lib/event-bus", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/actions/event-reward-actions";
import { sendDonationReceivedEmail } from "@/services/mail";
import {
  createDonation,
  listDonationsForCause,
  listUserDonations,
} from "@/actions/donation-actions";

const mockPrisma = prisma as unknown as {
  donation: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
  };
  cause: { update: jest.Mock; findUnique: jest.Mock };
  pledges: { updateMany: jest.Mock };
  campaign_follows: { findMany: jest.Mock };
};

const originalFetch = global.fetch;

describe("donation-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    (recordEvent as jest.Mock).mockResolvedValue({});
    (sendDonationReceivedEmail as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("createDonation", () => {
    it("returns existing donation when paystack reference already exists", async () => {
      mockPrisma.donation.findFirst.mockResolvedValue({ id: "don-1" });
      mockPrisma.donation.findUnique.mockResolvedValue({
        id: "don-1",
        causeId: "cause-1",
        amount: 5000,
        tip_amount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        name: "Jane",
        email: "jane@test.com",
        is_anonymous: false,
        status: "completed",
      });

      const result = await createDonation(
        "cause-1",
        "user-1",
        {
          amount: 5000,
          name: "Jane",
          email: "jane@test.com",
          isAnonymous: false,
        },
        0,
        "ref-existing",
      );

      expect(result.id).toBe("don-1");
      expect(mockPrisma.donation.create).not.toHaveBeenCalled();
    });

    it("creates donation, increments cause raised, and records event", async () => {
      mockPrisma.donation.findFirst.mockResolvedValue(null);
      mockPrisma.donation.create.mockResolvedValue({
        id: "don-new",
        causeId: "cause-1",
        amount: 10000,
        tip_amount: 500,
        createdAt: new Date("2026-01-15T00:00:00.000Z"),
        name: "Jane",
        email: "jane@test.com",
        is_anonymous: false,
        status: "completed",
      });
      mockPrisma.cause.update.mockResolvedValue({});
      mockPrisma.cause.findUnique
        .mockResolvedValueOnce({
          title: "Help School",
          raised: 10000,
          goal: 50000,
        })
        .mockResolvedValueOnce({
          title: "Help School",
          raised: 10000,
          goal: 50000,
          userId: "owner-1",
          user: { fullName: "Owner", email: "owner@test.com" },
        });
      mockPrisma.pledges.updateMany.mockResolvedValue({ count: 0 });

      const result = await createDonation(
        "cause-1",
        "user-1",
        {
          amount: 10000,
          name: "Jane",
          email: "jane@test.com",
          isAnonymous: false,
          tip_amount: 500,
        },
        500,
      );

      expect(result.amount).toBe(10000);
      expect(mockPrisma.cause.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cause-1" },
          data: { raised: { increment: 10000 } },
        }),
      );
      expect(recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "donation",
          userId: "user-1",
          amount: 10000,
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/causes/cause-1");
    });

    it("uses anonymous donor name when isAnonymous is true string", async () => {
      mockPrisma.donation.findFirst.mockResolvedValue(null);
      mockPrisma.donation.create.mockResolvedValue({
        id: "don-anon",
        causeId: "cause-1",
        amount: 1000,
        tip_amount: 0,
        createdAt: new Date("2026-01-15T00:00:00.000Z"),
        name: "Anonymous",
        email: "anon@test.com",
        is_anonymous: true,
        status: "completed",
      });
      mockPrisma.cause.update.mockResolvedValue({});
      mockPrisma.cause.findUnique
        .mockResolvedValueOnce({ title: "Cause", raised: 1000, goal: 10000 })
        .mockResolvedValueOnce({
          title: "Cause",
          raised: 1000,
          goal: 10000,
          userId: "owner-1",
          user: { fullName: "Owner", email: "owner@test.com" },
        });
      mockPrisma.pledges.updateMany.mockResolvedValue({ count: 0 });

      await createDonation("cause-1", null, {
        amount: 1000,
        name: "Hidden",
        email: "anon@test.com",
        isAnonymous: "true" as unknown as boolean,
      });

      expect(mockPrisma.donation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Anonymous" }),
        }),
      );
    });
  });

  describe("listDonationsForCause", () => {
    it("returns mapped donations for a cause", async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          id: "don-1",
          causeId: "cause-1",
          amount: 5000,
          tip_amount: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);

      const result = await listDonationsForCause("cause-1");

      expect(result[0].amount).toBe(5000);
      expect(result[0].created_at).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("listUserDonations", () => {
    it("returns user donations with cause info", async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          id: "don-1",
          causeId: "cause-1",
          amount: 5000,
          tip_amount: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          cause: {
            title: "Help School",
            category: "education",
            status: "approved",
            slug: null,
          },
        },
      ]);

      const result = await listUserDonations("user-1", "recent");

      expect(result[0].cause).toEqual({
        title: "Help School",
        category: "education",
        status: "approved",
        slug: null,
      });
    });
  });
});
