import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";



export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) {
    await logApiRequest({ request, statusCode: 429, errorCode: ApiErrorCode.RATE_LIMIT_EXCEEDED, startedAt });
    return limitRes.errorResponse;
  }

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) {
    await logApiRequest({ request, statusCode: 401, errorCode: ApiErrorCode.UNAUTHORIZED, startedAt });
    return authRes.errorResponse;
  }

  let campaign;
  try {
    const existing = await prisma.api_campaigns.findFirst({
      where: { id: params.id, developer_id: authRes.userId!, mode: authRes.mode! }
    });
    
    if (existing) {
      campaign = await prisma.api_campaigns.update({
        where: { id: params.id },
        data: { status: "active" }
      });
    }
  } catch (error) {
    console.error("Failed to resume campaign", error);
  }

  if (!campaign) {
    const response = errorResponse("Campaign not found or access denied", ApiErrorCode.NOT_FOUND, 404);

    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
    return response;
  }

  const response = successResponse({ id: campaign.id, status: campaign.status });

  await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
  return response;
}

export async function OPTIONS() {
  return handlePreflight();
}
