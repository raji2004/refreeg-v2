import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";



export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  try {
    const donationId = params.id;

    const limitRes = rateLimit(req);
    if (limitRes?.errorResponse) {
      await logApiRequest({ request: req, statusCode: 429, errorCode: ApiErrorCode.RATE_LIMIT_EXCEEDED, startedAt });
      return limitRes.errorResponse;
    }

    const auth = await validateApiKey(req);
    if (auth.errorResponse) {
      await logApiRequest({ request: req, statusCode: 401, errorCode: ApiErrorCode.UNAUTHORIZED, startedAt });
      return auth.errorResponse;
    }

    let donation;
    let error;
    try {
      donation = await prisma.api_donations.findFirst({
        where: { id: donationId }
      });
    } catch (err) {
      error = err;
    }

    if (error || !donation) {
      const response = errorResponse("Donation not found", ApiErrorCode.NOT_FOUND, 404);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
      return response;
    }

    // Verify developer ownership
    let campaign;
    try {
      campaign = await prisma.api_campaigns.findFirst({
        where: { id: donation.api_campaign_id },
        select: { developer_id: true }
      });
    } catch (err) {
      console.error(err);
    }

    if (!campaign || campaign.developer_id !== auth.userId) {
      const response = errorResponse("Unauthorized access to donation", ApiErrorCode.FORBIDDEN, 403);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.FORBIDDEN, startedAt });
      return response;
    }

    // Mode isolation: test keys should only see test donations (and vice-versa)
    const donationMode = (donation as any).mode || "live";
    if (donationMode !== auth.mode) {
      const response = errorResponse("Donation not found", ApiErrorCode.NOT_FOUND, 404);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
      return response;
    }

    // Return donation details
    const response = successResponse({
      id: donation.id,
      amount: donation.amount,
      tip_amount: donation.tip_amount,
      donor_name: donation.donor_name,
      donor_email: donation.donor_email,
      message: donation.message,
      is_anonymous: donation.is_anonymous,
      status: donation.status,
      reference: donation.paystack_reference,
      mode: donationMode,
      created_at: donation.created_at,
      campaign_id: donation.api_campaign_id
    });
    await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, startedAt });
    return response;

  } catch (error: any) {
    console.error("Donation fetch error:", error);
    const response = errorResponse(error.message || "Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
    await logApiRequest({ request: req, statusCode: response.status, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
    return response;
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
