/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/utils/api-bot/webhook-utils", () => ({
  dispatchWebhook: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    api_campaign_reports: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    api_campaigns: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    logs: { create: jest.fn() },
  },
}));

import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/role-actions";
import { dispatchWebhook } from "@/utils/api-bot/webhook-utils";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getApiCampaignReports,
  getDeveloperCampaignReports,
  updateReportStatus,
  takedownApiCampaign,
} from "@/actions/api-campaign-report-actions";

const mockAuth = auth as jest.Mock;
const mockIsAdminOrManager = isAdminOrManager as jest.Mock;
const mockDispatchWebhook = dispatchWebhook as jest.Mock;
const mockPrisma = prisma as unknown as {
  api_campaign_reports: {
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  api_campaigns: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  logs: { create: jest.Mock };
};

describe("api-campaign-report-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getApiCampaignReports", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getApiCampaignReports()).rejects.toThrow("Unauthorized");
    });

    it("throws when user is not admin or manager", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(getApiCampaignReports()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });

    it("returns all reports for admin", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      const reports = [{ id: "report-1", status: "pending" }];
      mockPrisma.api_campaign_reports.findMany.mockResolvedValue(reports);

      const result = await getApiCampaignReports();

      expect(result).toEqual(reports);
    });
  });

  describe("getDeveloperCampaignReports", () => {
    it("returns empty array when developer has no campaigns", async () => {
      mockAuth.mockResolvedValue({ user: { id: "dev-1" } });
      mockPrisma.api_campaigns.findMany.mockResolvedValue([]);

      const result = await getDeveloperCampaignReports();

      expect(result).toEqual([]);
      expect(mockPrisma.api_campaign_reports.findMany).not.toHaveBeenCalled();
    });

    it("returns reports for developer campaigns", async () => {
      mockAuth.mockResolvedValue({ user: { id: "dev-1" } });
      mockPrisma.api_campaigns.findMany.mockResolvedValue([
        { id: "camp-1" },
        { id: "camp-2" },
      ]);
      const reports = [{ id: "report-1" }];
      mockPrisma.api_campaign_reports.findMany.mockResolvedValue(reports);

      const result = await getDeveloperCampaignReports();

      expect(result).toEqual(reports);
      expect(mockPrisma.api_campaign_reports.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { api_campaign_id: { in: ["camp-1", "camp-2"] } },
        }),
      );
    });
  });

  describe("updateReportStatus", () => {
    it("updates report status and revalidates path", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.api_campaign_reports.update.mockResolvedValue({
        id: "report-1",
      });

      const result = await updateReportStatus("report-1", "resolved");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.api_campaign_reports.update).toHaveBeenCalledWith({
        where: { id: "report-1" },
        data: expect.objectContaining({
          status: "resolved",
          resolved_at: expect.any(Date),
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/admin/api-reports",
      );
    });
  });

  describe("takedownApiCampaign", () => {
    it("throws when campaign is not found", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.api_campaigns.findUnique.mockResolvedValue(null);

      await expect(takedownApiCampaign("missing")).rejects.toThrow(
        "Campaign not found",
      );
    });

    it("cancels campaign, resolves reports, logs, and dispatches webhook", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.api_campaigns.findUnique.mockResolvedValue({
        id: "camp-1",
        developer_id: "dev-1",
        title: "Bad Campaign",
      });
      mockPrisma.api_campaigns.update.mockResolvedValue({ id: "camp-1" });
      mockPrisma.api_campaign_reports.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.logs.create.mockResolvedValue({ id: "log-1" });
      mockDispatchWebhook.mockResolvedValue(undefined);

      const result = await takedownApiCampaign("camp-1");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.api_campaigns.update).toHaveBeenCalledWith({
        where: { id: "camp-1" },
        data: { status: "cancelled" },
      });
      expect(mockPrisma.api_campaign_reports.updateMany).toHaveBeenCalled();
      expect(mockDispatchWebhook).toHaveBeenCalledWith(
        "dev-1",
        "campaign.taken_down",
        expect.objectContaining({ campaign_id: "camp-1" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/admin/api-reports",
      );
    });
  });
});
