/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    referrals_v1: {
      findMany: jest.fn(),
    },
  },
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getReferralDashboardData } from "@/actions/referral-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; findMany: jest.Mock };
  referrals_v1: { findMany: jest.Mock };
};

describe("referral-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
  });

  describe("getReferralDashboardData", () => {
    it("returns null when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getReferralDashboardData();

      expect(result).toBeNull();
      expect(mockPrisma.referrals_v1.findMany).not.toHaveBeenCalled();
    });

    it("returns dashboard data with tier and referral stats", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.user.findUnique.mockResolvedValue({ referralCode: "REF123" });
      mockPrisma.referrals_v1.findMany.mockResolvedValue([
        {
          id_v1: "ref-1",
          referrer_id_v1: "user-1",
          referee_id_v1: "user-2",
          referee_email_v1: "referee@test.com",
          registered_v1: true,
          reward_v1: "+5 pts",
          created_at_v1: new Date("2026-01-15T10:00:00.000Z"),
          reward_status_v1: "ISSUED",
        },
        {
          id_v1: "ref-2",
          referrer_id_v1: "user-1",
          referee_id_v1: null,
          referee_email_v1: "pending@test.com",
          registered_v1: false,
          reward_v1: null,
          created_at_v1: new Date("2026-01-10T10:00:00.000Z"),
          reward_status_v1: "PENDING",
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "user-2",
          firstName: "Jane",
          email: "referee@test.com",
        },
      ]);

      const result = await getReferralDashboardData();

      expect(result).toEqual({
        referralLink: "https://example.com/auth/signup?ref_v1=REF123",
        points: 5,
        invites: 2,
        signUps: 1,
        tier: "Tier 1",
        referrals: [
          expect.objectContaining({
            id: "ref-1",
            registered: true,
            profiles: {
              first_name: "Jane",
              email: "referee@test.com",
              avatar_url: null,
            },
          }),
          expect.objectContaining({
            id: "ref-2",
            referee_id: null,
            profiles: null,
          }),
        ],
      });
    });

    it("uses userId as referral code when profile has none", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.user.findUnique.mockResolvedValue({ referralCode: null });
      mockPrisma.referrals_v1.findMany.mockResolvedValue([]);

      const result = await getReferralDashboardData();

      expect(result?.referralLink).toBe(
        "https://example.com/auth/signup?ref_v1=user-1",
      );
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});
