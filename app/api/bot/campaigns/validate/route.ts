import { NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
  rateLimit,
  handlePreflight,
} from "@/utils/api-bot/api-auth";
import { CreateCampaignSchema } from "@/utils/api-bot/schemas";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import {
  successResponse,
  errorResponse,
  ApiErrorCode,
} from "@/utils/api-bot/response-utils";

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const result = CreateCampaignSchema.safeParse(body);

    if (!result.success) {
      const response = errorResponse(
        "Validation failed",
        ApiErrorCode.VALIDATION_ERROR,
        400,
        result.error.format(),
      );

      await logApiRequest({
        request,
        statusCode: response.status,
        apiKeyId: authRes.apiKeyId,
        userId: authRes.userId,
        mode: authRes.mode,
        errorCode: ApiErrorCode.VALIDATION_ERROR,
        startedAt,
      });

      return response;
    }

    const response = successResponse({
      valid: true,
      message: "Campaign data is valid",
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
  } catch (err) {
    const response = errorResponse(
      "Invalid JSON format",
      ApiErrorCode.BAD_REQUEST,
      400,
    );

    await logApiRequest({
      request,
      statusCode: response.status,
      apiKeyId: authRes.apiKeyId,
      userId: authRes.userId,
      mode: authRes.mode,
      errorCode: ApiErrorCode.BAD_REQUEST,
      startedAt,
    });

    return response;
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
