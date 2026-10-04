import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/utils/api-bot/api-auth";
import { rateLimit } from "@/utils/api-bot/api-auth";
import { logApiRequest } from "@/utils/api-bot/request-logger";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  const rateLimitResult = rateLimit(request);
  if (rateLimitResult?.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 429,
      errorCode: "rate_limited",
      startedAt,
    });
    return rateLimitResult.errorResponse;
  }

  const authResult = await validateApiKey(request);
  if (authResult.errorResponse) {
    await logApiRequest({
      request,
      statusCode: 401,
      errorCode: "unauthorized",
      startedAt,
    });
    return authResult.errorResponse;
  }

  const response = NextResponse.json({
    status: "success",
    data: {
      message: "pong",
      mode: authResult.mode,
      user_id: authResult.userId,
      timestamp: new Date().toISOString(),
    },
  });

  await logApiRequest({
    request,
    statusCode: response.status,
    apiKeyId: authResult.apiKeyId,
    userId: authResult.userId,
    mode: authResult.mode,
    startedAt,
  });

  return response;
}
