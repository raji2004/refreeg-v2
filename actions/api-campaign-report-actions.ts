"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";
import { dispatchWebhook } from "@/utils/api-bot/webhook-utils";

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

export async function getApiCampaignReports() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

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

export async function getDeveloperCampaignReports() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

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

export async function updateReportStatus(reportId: string, newStatus: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  await prisma.api_campaign_reports.update({
    where: { id: reportId },
    data: {
      status: newStatus,

      ...(newStatus === "resolved" && { resolved_at: new Date() }),
    },
  });

  revalidatePath("/dashboard/admin/api-reports");
  return { success: true };
}

export async function takedownApiCampaign(campaignId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const campaign = await prisma.api_campaigns.findUnique({
    where: { id: campaignId },
    select: { id: true, developer_id: true, title: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  await prisma.api_campaigns.update({
    where: { id: campaignId },
    data: { status: "cancelled" },
  });

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

  await prisma.logs.create({
    data: {
      action: "takedown-api-campaign",
      admin_id: session.user.id,
      created_at: new Date(),
    },
  });

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
  }

  revalidatePath("/dashboard/admin/api-reports");
  revalidatePath("/dashboard/developer/reports");

  return { success: true };
}
