// actions/api-campaign-report-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";
import { dispatchWebhook } from "@/utils/api-bot/webhook-utils";

// Type for the report with campaign data
type ReportWithCampaign = {
  id: string;
  api_campaign_id: string;
  reason: string;
  message: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  developer_id: string;
  api_key_id: string | null;
  resolution_notes: string | null;
  resolved_at: Date | null;
  api_campaign: {
    id: string;
    title: string;
    developer_id: string;
  } | null;
};

/**
 * ADMIN: Get all reports across the platform
 */
export async function getApiCampaignReports() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify the user is an admin or manager
  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const reports = await prisma.api_campaign_reports.findMany({
    select: {
      id: true,
      api_campaign_id: true,
      reason: true,
      message: true,
      status: true,
      created_at: true,
      updated_at: true,
      developer_id: true,
      api_key_id: true,
      resolution_notes: true,
      resolved_at: true,
      api_campaign: {
        select: {
          id: true,
          title: true,
          developer_id: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return reports as ReportWithCampaign[];
}

/**
 * DEVELOPER: Get all reports for their own campaigns
 */
export async function getDeveloperCampaignReports() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // First fetch the developer's campaigns
  const campaigns = await prisma.api_campaigns.findMany({
    where: { developer_id: session.user.id },
    select: { id: true },
  });

  if (campaigns.length === 0) {
    return [];
  }

  const campaignIds = campaigns.map((c) => c.id);

  const reports = await prisma.api_campaign_reports.findMany({
    where: {
      api_campaign_id: {
        in: campaignIds,
      },
    },
    select: {
      id: true,
      api_campaign_id: true,
      reason: true,
      message: true,
      status: true,
      created_at: true,
      updated_at: true,
      developer_id: true,
      api_key_id: true,
      resolution_notes: true,
      resolved_at: true,
      api_campaign: {
        select: {
          id: true,
          title: true,
          developer_id: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return reports as ReportWithCampaign[];
}

/**
 * ADMIN: Change status of a report (e.g. pending -> investigating -> resolved)
 */
export async function updateReportStatus(reportId: string, newStatus: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify the user is an admin or manager
  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  await prisma.api_campaign_reports.update({
    where: { id: reportId },
    data: {
      status: newStatus,
      // If marking as resolved, set resolved_at
      ...(newStatus === "resolved" && { resolved_at: new Date() }),
    },
  });

  revalidatePath("/dashboard/admin/api-reports");
  return { success: true };
}

/**
 * ADMIN: Takedown a campaign (set status to cancelled) and resolve reports
 */
export async function takedownApiCampaign(campaignId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify the user is an admin or manager
  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  // 1. Get campaign details before updating (for webhook)
  const campaign = await prisma.api_campaigns.findUnique({
    where: { id: campaignId },
    select: { id: true, developer_id: true, title: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // 2. Update Campaign Status to cancelled
  await prisma.api_campaigns.update({
    where: { id: campaignId },
    data: { status: "cancelled" },
  });

  // 3. Resolve all pending reports for this campaign
  await prisma.api_campaign_reports.updateMany({
    where: {
      api_campaign_id: campaignId,
      status: "pending",
    },
    data: {
      status: "resolved",
      resolved_at: new Date(),
      resolution_notes:
        "Campaign cancelled by RefreeG moderation team following reports.",
    },
  });

  // 4. Log the admin action
  await prisma.logs.create({
    data: {
      action: "takedown-api-campaign",
      admin_id: session.user.id,
      created_at: new Date(),
    },
  });

  // 5. Trigger Webhook
  try {
    await dispatchWebhook(campaign.developer_id, "campaign.taken_down", {
      campaign_id: campaign.id,
      campaign_title: campaign.title,
      reason:
        "Campaign cancelled by RefreeG moderation team following reports.",
      cancelled_at: new Date().toISOString(),
    });
  } catch (webhookError) {
    console.error("Webhook dispatch failed:", webhookError);
    // Don't fail the takedown if webhook fails
  }

  revalidatePath("/dashboard/admin/api-reports");
  revalidatePath("/dashboard/developer/reports");

  return { success: true };
}
