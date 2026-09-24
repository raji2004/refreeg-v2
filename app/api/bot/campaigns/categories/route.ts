import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/api-bot/api-auth";
import { rateLimit } from "@/utils/api-bot/api-auth";
import { logApiRequest } from "@/utils/api-bot/request-logger";

const CATEGORIES = [
  { id: "education", display_name: "Education" },
  { id: "health", display_name: "Healthcare" },
  { id: "environment", display_name: "Environment" },
  { id: "community", display_name: "Community" },
  { id: "disaster", display_name: "Disaster Relief" },
  { id: "animals", display_name: "Animal Welfare" },
  { id: "creative", display_name: "Creative" },
  { id: "business", display_name: "Business" },
];

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 429,
      errorCode: "rate_limited",
      startedAt,
    });
    return limitRes.errorResponse;
  }

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 401,
      errorCode: "unauthorized",
      startedAt,
    });
    return authRes.errorResponse;
  }

  const response = NextResponse.json({
    status: "success",
    data: CATEGORIES,
  });

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
