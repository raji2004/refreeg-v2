// actions/api-monitoring-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { formatCurrency } from "@/lib/utils";

export interface ApiMonitoringSummary {
  activeKeys: number;
  totalKeys: number;
  apiCampaigns: number;
  activeCampaigns: number;
  pendingReports: number;
  totalRequestVolume: number;
  requestErrorRate: number;
  donationVolume: string;
  platformFeeRevenue: string;
}

export interface AdminApiCampaignRow {
  id: string;
  title: string;
  status: string;
  mode: string;
  payoutMode: string;
  currency: string;
  goalAmount: number;
  raisedAmount: number;
  developerId: string;
  developerName: string;
  developerEmail: string;
  apiKeyName: string | null;
  createdAt: Date;
  updatedAt: Date;
  reportsCount: number;
}

export interface AdminApiDonationRow {
  id: string;
  campaignId: string;
  campaignTitle: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  amount: number;
  tipAmount: number;
  feeRevenue: number;
  donorName: string;
  donorEmail: string;
  status: string;
  createdAt: Date;
  paystackReference: string;
}

export interface CampaignReportRow {
  id: string;
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  developerId: string;
  developerName: string;
  developerEmail: string;
  reportReason: string;
  reportMessage: string;
  reportStatus: string;
  apiKeyName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
}

export interface ApiUsageAnalytics {
  requestVolume: number;
  activeKeys: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number; errorRate: number }>;
  recentErrors: Array<{
    id: string;
    endpoint: string;
    statusCode: number;
    errorCode: string | null;
    createdAt: Date;
    apiKeyPrefix: string | null;
  }>;
}

async function requireAdminAccess(): Promise<{
  userId: string;
  role: "admin" | "manager";
}> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const role = await getUserRole(session.user.id);

  if (role !== "admin" && role !== "manager") {
    throw new Error("Access denied");
  }

  return { userId: session.user.id, role: role as "admin" | "manager" };
}

export async function getApiMonitoringSummary(): Promise<ApiMonitoringSummary> {
  await requireAdminAccess();

  // Get all API keys
  const allKeys = await prisma.api_keys.findMany({
    select: {
      id: true,
      revoked_at: true,
      last_used_at: true,
    },
  });

  const activeKeys = allKeys.filter(
    (key) => !key.revoked_at && !!key.last_used_at,
  ).length;
  const totalKeys = allKeys.length;

  // Get all API campaigns
  const allCampaigns = await prisma.api_campaigns.findMany({
    select: {
      id: true,
      status: true,
    },
  });

  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter(
    (campaign) => campaign.status === "active",
  ).length;

  // Get pending reports
  const pendingReports = await prisma.api_campaign_reports.count({
    where: { status: "pending" },
  });

  // Get donations
  const successfulDonations = await prisma.api_donations.findMany({
    where: { status: "success" },
    select: { amount: true },
  });

  const donationVolume = successfulDonations.reduce(
    (sum, donation) => sum + Number(donation.amount),
    0,
  );

  // Get request logs for error rate
  const requestLogs = await prisma.api_request_logs.findMany({
    select: { status_code: true },
  });

  const totalRequestVolume = requestLogs.length;
  const totalErrors = requestLogs.filter(
    (log) => Number(log.status_code) >= 400,
  ).length;
  const requestErrorRate =
    totalRequestVolume > 0
      ? Number(((totalErrors / totalRequestVolume) * 100).toFixed(1))
      : 0;

  return {
    activeKeys,
    totalKeys,
    apiCampaigns: totalCampaigns,
    activeCampaigns,
    pendingReports,
    totalRequestVolume,
    requestErrorRate,
    donationVolume: formatCurrency(donationVolume),
    platformFeeRevenue: formatCurrency(donationVolume * 0.02),
  };
}

export async function listAdminApiCampaigns(): Promise<AdminApiCampaignRow[]> {
  await requireAdminAccess();

  // Get all campaigns
  const campaigns = await prisma.api_campaigns.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      mode: true,
      payout_mode: true,
      currency: true,
      goal_amount: true,
      raised_amount: true,
      developer_id: true,
      api_key_id: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  if (campaigns.length === 0) return [];

  // Get unique developer IDs
  const developerIds = [...new Set(campaigns.map((c) => c.developer_id))];

  // Get profiles for developers
  const developers = await prisma.user.findMany({
    where: { id: { in: developerIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  const developerMap = new Map(
    developers.map((dev) => [
      dev.id,
      {
        name: dev.fullName ?? "Unknown developer",
        email: dev.email ?? "Unknown email",
      },
    ]),
  );

  // Get API key names
  const apiKeyIds = [
    ...new Set(campaigns.map((c) => c.api_key_id).filter(Boolean)),
  ] as string[];
  const apiKeys = await prisma.api_keys.findMany({
    where: { id: { in: apiKeyIds } },
    select: { id: true, name: true },
  });

  const apiKeyMap = new Map(apiKeys.map((key) => [key.id, key.name]));

  // Get report counts per campaign
  const reportCounts = await prisma.api_campaign_reports.groupBy({
    by: ["api_campaign_id"],
    _count: { id: true },
  });

  const reportCountMap = new Map(
    reportCounts.map((rc) => [rc.api_campaign_id, rc._count.id]),
  );

  return campaigns.map((campaign) => {
    const developer = developerMap.get(campaign.developer_id);
    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      mode: campaign.mode,
      payoutMode: campaign.payout_mode,
      currency: campaign.currency,
      goalAmount: Number(campaign.goal_amount),
      raisedAmount: Number(campaign.raised_amount),
      developerId: campaign.developer_id,
      developerName: developer?.name ?? "Unknown developer",
      developerEmail: developer?.email ?? "Unknown email",
      apiKeyName: campaign.api_key_id
        ? (apiKeyMap.get(campaign.api_key_id) ?? null)
        : null,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      reportsCount: reportCountMap.get(campaign.id) ?? 0,
    };
  });
}

export async function listAdminApiDonations(): Promise<AdminApiDonationRow[]> {
  await requireAdminAccess();

  // Get all donations
  const donations = await prisma.api_donations.findMany({
    select: {
      id: true,
      api_campaign_id: true,
      amount: true,
      tip_amount: true,
      donor_name: true,
      donor_email: true,
      status: true,
      created_at: true,
      paystack_reference: true,
    },
    orderBy: { created_at: "desc" },
  });

  if (donations.length === 0) return [];

  // Get campaign details
  const campaignIds = [...new Set(donations.map((d) => d.api_campaign_id))];
  const campaigns = await prisma.api_campaigns.findMany({
    where: { id: { in: campaignIds } },
    select: {
      id: true,
      title: true,
      developer_id: true,
    },
  });

  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

  // Get developer details
  const developerIds = [...new Set(campaigns.map((c) => c.developer_id))];
  const developers = await prisma.user.findMany({
    where: { id: { in: developerIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  const developerMap = new Map(
    developers.map((dev) => [
      dev.id,
      {
        name: dev.fullName ?? "Unknown developer",
        email: dev.email ?? "Unknown email",
      },
    ]),
  );

  return donations.map((donation) => {
    const campaign = campaignMap.get(donation.api_campaign_id);
    const developer = campaign
      ? developerMap.get(campaign.developer_id)
      : undefined;
    const amount = Number(donation.amount);

    return {
      id: donation.id,
      campaignId: donation.api_campaign_id,
      campaignTitle: campaign?.title ?? "Unknown campaign",
      developerId: campaign?.developer_id ?? "",
      developerName: developer?.name ?? "Unknown developer",
      developerEmail: developer?.email ?? "Unknown email",
      amount: amount,
      tipAmount: Number(donation.tip_amount),
      feeRevenue: amount * 0.02,
      donorName: donation.donor_name,
      donorEmail: donation.donor_email,
      status: donation.status,
      createdAt: donation.created_at,
      paystackReference: donation.paystack_reference,
    };
  });
}

export async function listCampaignReports(): Promise<CampaignReportRow[]> {
  await requireAdminAccess();

  // Get all reports
  const reports = await prisma.api_campaign_reports.findMany({
    select: {
      id: true,
      api_campaign_id: true,
      developer_id: true,
      api_key_id: true,
      reason: true,
      message: true,
      status: true,
      created_at: true,
      resolved_at: true,
      resolution_notes: true,
    },
    orderBy: { created_at: "desc" },
  });

  if (reports.length === 0) return [];

  // Get campaign details
  const campaignIds = [...new Set(reports.map((r) => r.api_campaign_id))];
  const campaigns = await prisma.api_campaigns.findMany({
    where: { id: { in: campaignIds } },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

  // Get developer details
  const developerIds = [...new Set(reports.map((r) => r.developer_id))];
  const developers = await prisma.user.findMany({
    where: { id: { in: developerIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  const developerMap = new Map(
    developers.map((dev) => [
      dev.id,
      {
        name: dev.fullName ?? "Unknown developer",
        email: dev.email ?? "Unknown email",
      },
    ]),
  );

  // Get API key names
  const apiKeyIds = [
    ...new Set(reports.map((r) => r.api_key_id).filter(Boolean)),
  ] as string[];
  const apiKeys = await prisma.api_keys.findMany({
    where: { id: { in: apiKeyIds } },
    select: { id: true, name: true },
  });

  const apiKeyMap = new Map(apiKeys.map((key) => [key.id, key.name]));

  return reports.map((report) => {
    const campaign = campaignMap.get(report.api_campaign_id);
    const developer = developerMap.get(report.developer_id);

    return {
      id: report.id,
      campaignId: report.api_campaign_id,
      campaignTitle: campaign?.title ?? "Unknown campaign",
      campaignStatus: campaign?.status ?? "unknown",
      developerId: report.developer_id,
      developerName: developer?.name ?? "Unknown developer",
      developerEmail: developer?.email ?? "Unknown email",
      reportReason: report.reason,
      reportMessage: report.message,
      reportStatus: report.status,
      apiKeyName: report.api_key_id
        ? (apiKeyMap.get(report.api_key_id) ?? null)
        : null,
      createdAt: report.created_at,
      resolvedAt: report.resolved_at,
      resolutionNotes: report.resolution_notes,
    };
  });
}

export async function getApiUsageAnalytics(): Promise<ApiUsageAnalytics> {
  await requireAdminAccess();

  // Get recent request logs
  const logs = await prisma.api_request_logs.findMany({
    select: {
      id: true,
      endpoint: true,
      status_code: true,
      error_code: true,
      created_at: true,
      api_key_id: true,
    },
    orderBy: { created_at: "desc" },
    take: 1000,
  });

  if (logs.length === 0) {
    return {
      requestVolume: 0,
      activeKeys: 0,
      errorRate: 0,
      topEndpoints: [],
      recentErrors: [],
    };
  }

  // Get API key prefixes
  const apiKeyIds = [
    ...new Set(logs.map((log) => log.api_key_id).filter(Boolean)),
  ] as string[];
  const apiKeys = await prisma.api_keys.findMany({
    where: { id: { in: apiKeyIds } },
    select: { id: true, key_prefix: true },
  });

  const keyMap = new Map(apiKeys.map((key) => [key.id, key.key_prefix]));

  // Calculate endpoint statistics
  const endpointCounts = new Map<string, { count: number; errors: number }>();
  let errors = 0;

  logs.forEach((log) => {
    const endpoint = log.endpoint || "unknown";
    const entry = endpointCounts.get(endpoint) ?? { count: 0, errors: 0 };
    entry.count += 1;

    if (Number(log.status_code) >= 400) {
      entry.errors += 1;
      errors += 1;
    }

    endpointCounts.set(endpoint, entry);
  });

  const topEndpoints = [...endpointCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      errorRate:
        stats.count > 0
          ? Number(((stats.errors / stats.count) * 100).toFixed(1))
          : 0,
    }));

  const activeKeys = new Set(logs.map((log) => log.api_key_id).filter(Boolean))
    .size;
  const errorRate =
    logs.length > 0 ? Number(((errors / logs.length) * 100).toFixed(1)) : 0;

  const recentErrors = logs
    .filter((log) => Number(log.status_code) >= 400)
    .slice(0, 20)
    .map((log) => ({
      id: log.id,
      endpoint: log.endpoint,
      statusCode: Number(log.status_code),
      errorCode: log.error_code,
      createdAt: log.created_at,
      apiKeyPrefix: log.api_key_id
        ? (keyMap.get(log.api_key_id) ?? null)
        : null,
    }));

  return {
    requestVolume: logs.length,
    activeKeys,
    errorRate,
    topEndpoints,
    recentErrors,
  };
}

export async function takeDownApiCampaign(formData: FormData) {
  const { userId } = await requireAdminAccess();

  const campaignId = String(formData.get("campaignId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const notes = String(
    formData.get("notes") ?? "Taken down from admin dashboard",
  );

  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  // Update campaign status to cancelled
  await prisma.api_campaigns.update({
    where: { id: campaignId },
    data: { status: "cancelled" },
  });

  // Update report status if report ID provided
  if (reportId) {
    await prisma.api_campaign_reports.update({
      where: { id: reportId },
      data: {
        status: "resolved",
        resolved_at: new Date(),
        resolution_notes: notes,
      },
    });
  }

  // Log the admin action
  await prisma.logs.create({
    data: {
      action: "take-down-api-campaign",
      admin_id: userId,
      created_at: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/api-monitoring");
  revalidatePath("/dashboard/admin/api-monitoring/campaigns");
  revalidatePath("/dashboard/admin/api-monitoring/reports");
}
