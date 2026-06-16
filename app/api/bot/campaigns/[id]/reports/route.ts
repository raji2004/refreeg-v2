import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { ReportCampaignSchema } from "@/utils/api-bot/schemas";
import { dispatchWebhook } from "@/utils/api-bot/webhook-utils";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";



export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const limitRes = rateLimit(request, 30, 60000);
    if (limitRes?.errorResponse) return limitRes.errorResponse;

    const authRes = await validateApiKey(request);
    if (authRes?.errorResponse) return authRes.errorResponse;
    const developerId = authRes.userId;

    let campaign;
    let campaignError;
    try {
      campaign = await prisma.api_campaigns.findFirst({
        where: { id: params.id, developer_id: developerId! },
        select: { id: true }
      });
    } catch (err) {
      campaignError = err;
    }

    if (campaignError || !campaign) {
      return errorResponse("Campaign not found or unauthorized to view its reports", ApiErrorCode.NOT_FOUND, 404);
    }

    let reports: any[] = [];
    let reportsError;
    try {
      reports = await prisma.api_campaign_reports.findMany({
        where: { api_campaign_id: params.id },
        orderBy: { created_at: "desc" }
      });
    } catch (err) {
      reportsError = err;
    }

    if (reportsError) {
      console.error("Error fetching reports:", reportsError);
      return errorResponse("Failed to fetch reports", ApiErrorCode.INTERNAL_ERROR, 500);
    }

    return successResponse({ reports });
  } catch (error) {
    console.error("Fetch reports error:", error);
    return errorResponse("Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const limitRes = rateLimit(request, 10, 60000);
    if (limitRes?.errorResponse) return limitRes.errorResponse;

    const authRes = await validateApiKey(request);
    if (authRes?.errorResponse) return authRes.errorResponse;

    let campaign;
    let campaignError;
    try {
      campaign = await prisma.api_campaigns.findFirst({
        where: { id: params.id },
        select: { id: true, developer_id: true }
      });
    } catch (err) {
      campaignError = err;
    }

    if (campaignError || !campaign) {
      return errorResponse("Campaign not found", ApiErrorCode.NOT_FOUND, 404);
    }

    const body = await request.json();
    const result = ReportCampaignSchema.safeParse(body);

    if (!result.success) {
      return errorResponse("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, result.error.format());
    }

    const { reason, message } = result.data;

    let report;
    let insertError;
    try {
      report = await prisma.api_campaign_reports.create({
        data: {
          api_campaign_id: campaign.id,
          developer_id: campaign.developer_id,
          api_key_id: authRes.apiKeyId,
          reason,
          message: message || "",
          status: "pending",
        }
      });
    } catch (err) {
      insertError = err;
    }

    if (insertError || !report) {
      console.error("Error inserting report:", insertError);
      return errorResponse("Failed to submit report", ApiErrorCode.INTERNAL_ERROR, 500);
    }

    // Notify the developer whose campaign was reported via webhook
    await dispatchWebhook(
      campaign.developer_id,
      "campaign.reported",
      {
        campaign_id: campaign.id,
        report_id: report.id,
        reason: report.reason,
        status: report.status,
        message: report.message,
        created_at: report.created_at
      }
    );

    return successResponse({ message: "Report submitted successfully", report }, 201);
  } catch (error) {
    console.error("Report error:", error);
    return errorResponse("Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
