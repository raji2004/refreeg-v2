/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auth/admin-auth", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    api_keys: { findMany: jest.fn() },
    api_campaigns: { findMany: jest.fn(), update: jest.fn() },
    api_campaign_reports: {
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    api_donations: { findMany: jest.fn() },
    api_request_logs: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    logs: { create: jest.fn() },
  },
}));

import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getApiMonitoringSummary,
  listAdminApiCampaigns,
  getApiUsageAnalytics,
  takeDownApiCampaign,
} from "@/actions/api-monitoring-actions";

const mockAuth = auth as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockPrisma = prisma as unknown as {
  api_keys: { findMany: jest.Mock };
  api_campaigns: { findMany: jest.Mock; update: jest.Mock };
  api_campaign_reports: {
    count: jest.Mock;
    groupBy: jest.Mock;
    update: jest.Mock;
  };
  api_donations: { findMany: jest.Mock };
  api_request_logs: { findMany: jest.Mock };
  user: { findMany: jest.Mock };
  logs: { create: jest.Mock };
};

describe("api-monitoring-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockGetUserRole.mockResolvedValue("admin");
  });

  describe("getApiMonitoringSummary", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getApiMonitoringSummary()).rejects.toThrow("Unauthorized");
    });

    it("throws when user lacks admin access", async () => {
      mockGetUserRole.mockResolvedValue("user");

      await expect(getApiMonitoringSummary()).rejects.toThrow("Access denied");
    });

    it("returns monitoring summary for admin", async () => {
      mockPrisma.api_keys.findMany.mockResolvedValue([
        { id: "k1", revoked_at: null, last_used_at: new Date() },
        { id: "k2", revoked_at: new Date(), last_used_at: new Date() },
      ]);
      mockPrisma.api_campaigns.findMany.mockResolvedValue([
        { id: "c1", status: "active" },
        { id: "c2", status: "paused" },
      ]);
      mockPrisma.api_campaign_reports.count.mockResolvedValue(3);
      mockPrisma.api_donations.findMany.mockResolvedValue([
        { amount: 1000 },
        { amount: 2000 },
      ]);
      mockPrisma.api_request_logs.findMany.mockResolvedValue([
        { status_code: 200 },
        { status_code: 500 },
      ]);

      const result = await getApiMonitoringSummary();

      expect(result.activeKeys).toBe(1);
      expect(result.totalKeys).toBe(2);
      expect(result.apiCampaigns).toBe(2);
      expect(result.activeCampaigns).toBe(1);
      expect(result.pendingReports).toBe(3);
      expect(result.requestErrorRate).toBe(50);
      expect(result.donationVolume).toContain("3");
    });
  });

  describe("listAdminApiCampaigns", () => {
    it("returns empty array when no campaigns exist", async () => {
      mockPrisma.api_campaigns.findMany.mockResolvedValue([]);

      const result = await listAdminApiCampaigns();

      expect(result).toEqual([]);
    });

    it("maps campaigns with developer and API key details", async () => {
      mockPrisma.api_campaigns.findMany.mockResolvedValue([
        {
          id: "camp-1",
          title: "Help Fund",
          status: "active",
          mode: "live",
          payout_mode: "direct",
          currency: "NGN",
          goal_amount: 10000,
          raised_amount: 2500,
          developer_id: "dev-1",
          api_key_id: "key-1",
          created_at: new Date("2026-01-01"),
          updated_at: new Date("2026-01-02"),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "dev-1",
          fullName: "Developer",
          email: "dev@example.com",
        },
      ]);
      mockPrisma.api_keys.findMany.mockResolvedValue([
        { id: "key-1", name: "Production Key" },
      ]);
      mockPrisma.api_campaign_reports.groupBy.mockResolvedValue([
        { api_campaign_id: "camp-1", _count: { id: 2 } },
      ]);

      const result = await listAdminApiCampaigns();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "camp-1",
          developerName: "Developer",
          apiKeyName: "Production Key",
          reportsCount: 2,
          goalAmount: 10000,
        }),
      );
    });
  });

  describe("getApiUsageAnalytics", () => {
    it("returns empty analytics when no logs exist", async () => {
      mockPrisma.api_request_logs.findMany.mockResolvedValue([]);

      const result = await getApiUsageAnalytics();

      expect(result).toEqual({
        requestVolume: 0,
        activeKeys: 0,
        errorRate: 0,
        topEndpoints: [],
        recentErrors: [],
      });
    });

    it("calculates endpoint stats and recent errors", async () => {
      mockPrisma.api_request_logs.findMany.mockResolvedValue([
        {
          id: "log-1",
          endpoint: "/api/campaigns",
          status_code: 200,
          error_code: null,
          created_at: new Date(),
          api_key_id: "key-1",
        },
        {
          id: "log-2",
          endpoint: "/api/campaigns",
          status_code: 500,
          error_code: "ERR",
          created_at: new Date(),
          api_key_id: "key-1",
        },
      ]);
      mockPrisma.api_keys.findMany.mockResolvedValue([
        { id: "key-1", key_prefix: "rg_live_abc" },
      ]);

      const result = await getApiUsageAnalytics();

      expect(result.requestVolume).toBe(2);
      expect(result.activeKeys).toBe(1);
      expect(result.errorRate).toBe(50);
      expect(result.topEndpoints[0]).toEqual(
        expect.objectContaining({ endpoint: "/api/campaigns", count: 2 }),
      );
      expect(result.recentErrors).toHaveLength(1);
    });
  });

  describe("takeDownApiCampaign", () => {
    it("throws when campaign ID is missing", async () => {
      const formData = new FormData();

      await expect(takeDownApiCampaign(formData)).rejects.toThrow(
        "Campaign ID is required",
      );
    });

    it("cancels campaign, resolves report, and logs action", async () => {
      const formData = new FormData();
      formData.set("campaignId", "camp-1");
      formData.set("reportId", "report-1");
      formData.set("notes", "Policy violation");

      mockPrisma.api_campaigns.update.mockResolvedValue({ id: "camp-1" });
      mockPrisma.api_campaign_reports.update.mockResolvedValue({
        id: "report-1",
      });
      mockPrisma.logs.create.mockResolvedValue({ id: "log-1" });

      await takeDownApiCampaign(formData);

      expect(mockPrisma.api_campaigns.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: { status: "cancelled" },
      });
      expect(mockPrisma.api_campaign_reports.update).toHaveBeenCalled();
      expect(mockPrisma.logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "take-down-api-campaign",
          admin_id: "admin-1",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/admin/api-monitoring",
      );
    });
  });
});
