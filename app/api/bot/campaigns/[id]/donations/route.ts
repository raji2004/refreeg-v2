import { NextRequest } from "next/server";
import { validateApiKey, rateLimit } from "@/utils/api-bot/api-auth";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import {
  errorResponse,
  paginatedResponse,
  ApiErrorCode,
} from "@/utils/api-bot/response-utils";



export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 429,
      errorCode: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      startedAt,
    });
    return limitRes.errorResponse;
  }

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 401,
      errorCode: ApiErrorCode.UNAUTHORIZED,
      startedAt,
    });
    return authRes.errorResponse;
  }

  // Verify campaign ownership
  let campaign;
  let campaignError;
  try {
    campaign = await prisma.api_campaigns.findFirst({
      where: {
        id: params.id,
        developer_id: authRes.userId!,
        mode: authRes.mode!
      },
      select: { id: true }
    });
  } catch (err) {
    campaignError = err;
  }

  if (campaignError || !campaign) {
    const response = errorResponse(
      "Campaign not found or access denied",
      ApiErrorCode.NOT_FOUND,
      404,
    );

    await logApiRequest({
      request,
      statusCode: response.status,
      apiKeyId: authRes.apiKeyId,
      userId: authRes.userId,
      mode: authRes.mode,
      errorCode: ApiErrorCode.NOT_FOUND,
      startedAt,
    });
    return response;
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let donations: any[] = [];
  let count = 0;
  let error;
  try {
    const whereClause = { api_campaign_id: params.id };
    [donations, count] = await Promise.all([
      prisma.api_donations.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.api_donations.count({ where: whereClause })
    ]);
  } catch (err) {
    error = err;
  }

  if (error) {
    const response = errorResponse(
      "Failed to fetch donations",
      ApiErrorCode.INTERNAL_ERROR,
      500,
    );

    await logApiRequest({
      request,
      statusCode: response.status,
      apiKeyId: authRes.apiKeyId,
      userId: authRes.userId,
      mode: authRes.mode,
      errorCode: ApiErrorCode.INTERNAL_ERROR,
      startedAt,
    });
    return response;
  }

  const response = paginatedResponse(
    donations || [],
    count || 0,
    limit,
    offset,
  );

  await logApiRequest({
    request,
    statusCode: response.status,
    apiKeyId: authRes.apiKeyId,
    userId: authRes.userId,
    mode: authRes.mode,
    startedAt,
  });
  return response;
}
