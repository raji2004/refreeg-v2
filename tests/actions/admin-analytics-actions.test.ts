/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/admin-auth", () => ({
  requireAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    donation: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    cause: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    crypto_donations: { findMany: jest.fn() },
    kyc_verifications: { count: jest.fn() },
    api_campaigns: { findMany: jest.fn() },
    api_keys: { findMany: jest.fn() },
  },
}));

import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getAdminAnalytics,
  getDonationTrends,
  getAlerts,
  getApiCampaigns,
} from "@/actions/admin-analytics-actions";

const mockRequireAdmin = requireAdminOrManager as jest.Mock;
const mockPrisma = prisma as unknown as {
  donation: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  user: { count: jest.Mock; findMany: jest.Mock };
  cause: { count: jest.Mock; groupBy: jest.Mock };
  crypto_donations: { findMany: jest.Mock };
  kyc_verifications: { count: jest.Mock };
  api_campaigns: { findMany: jest.Mock };
  api_keys: { findMany: jest.Mock };
};

describe("admin-analytics-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(undefined);
  });

  describe("getAdminAnalytics", () => {
    it("requires admin access", async () => {
      mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"));

      await expect(getAdminAnalytics()).rejects.toThrow("Unauthorized");
    });

    it("returns analytics summary for the date range", async () => {
      mockPrisma.donation.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } })
        .mockResolvedValueOnce({ _sum: { amount: 2500 } });
      mockPrisma.user.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);
      mockPrisma.cause.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(40);
      mockPrisma.cause.count.mockResolvedValueOnce(5);

      const result = await getAdminAnalytics(
        "2026-01-01",
        "2026-01-31",
      );

      expect(result.totalDonations.trend).toBe(100);
      expect(result.totalUsers.current).toBe(100);
      expect(result.totalUsers.newInPeriod).toBe(10);
      expect(result.activeCauses).toEqual({ active: 25, total: 40 });
      expect(result.pendingApprovals.current).toBe(5);
    });
  });

  describe("getDonationTrends", () => {
    it("aggregates regular and crypto donations by day", async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          amount: 1000,
          createdAt: new Date("2026-01-15T12:00:00.000Z"),
        },
      ]);
      mockPrisma.crypto_donations.findMany.mockResolvedValue([
        {
          amount_in_naira: 500,
          created_at: new Date("2026-01-15T14:00:00.000Z"),
        },
      ]);

      const result = await getDonationTrends("2026-01-15", "2026-01-15");

      const dayEntry = result.find((entry) => entry.period === "Jan 15");
      expect(dayEntry).toEqual(
        expect.objectContaining({
          regular: 1000,
          crypto: 500,
          total: 1500,
          count: 2,
        }),
      );
    });
  });

  describe("getAlerts", () => {
    it("returns warning when pending causes exceed threshold", async () => {
      mockPrisma.cause.count.mockResolvedValue(15);

      const result = await getAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "pending-causes",
          type: "warning",
          value: "15",
        }),
      );
    });

    it("returns empty array when pending causes are below threshold", async () => {
      mockPrisma.cause.count.mockResolvedValue(3);

      const result = await getAlerts();

      expect(result).toEqual([]);
    });
  });

  describe("getApiCampaigns", () => {
    it("returns campaigns with API key metadata and stats", async () => {
      mockPrisma.api_campaigns.findMany
        .mockResolvedValueOnce([
          {
            id: "camp-1",
            title: "Test Campaign",
            status: "active",
            created_at: new Date("2026-01-01"),
            api_key_id: "key-1",
          },
        ])
        .mockResolvedValueOnce([{ api_key_id: "key-1" }]);
      mockPrisma.api_keys.findMany
        .mockResolvedValueOnce([
          {
            id: "key-1",
            name: "Dev API",
            key_prefix: "rg_live_abc",
            mode: "live",
          },
        ])
        .mockResolvedValueOnce([
          { id: "key-1", key_prefix: "rg_live_abc", mode: "live" },
        ]);

      const result = await getApiCampaigns();

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]).toEqual(
        expect.objectContaining({
          id: "camp-1",
          apiName: "Dev API",
          apiMode: "live",
        }),
      );
      expect(result.stats.total).toBe(1);
    });
  });
});
