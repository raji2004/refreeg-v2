import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";

const RegisterWebhookSchema = z.object({
  url: z.string().url("A valid HTTPS URL is required").startsWith("https://", "Webhooks must use HTTPS for security"),
  events: z.array(z.enum(["campaign.created", "donation.success", "campaign.completed", "campaign.updated", "campaign.reported"])).min(1, "At least one event must be selected"),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
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

  try {
    const body = await req.json();
    const validated = RegisterWebhookSchema.parse(body);

    const secret = `wh_sec_${crypto.randomBytes(24).toString("hex")}`;

    let data;
    let error;
    try {
      data = await prisma.api_webhooks.create({
        data: {
          user_id: auth.userId!,
          url: validated.url,
          events: validated.events,
          secret,
          is_active: true
        }
      });
    } catch (err) {
      error = err;
    }

    if (error || !data) {
      console.error("Error registering webhook:", error);
      const response = errorResponse("Failed to register webhook", ApiErrorCode.DATABASE_ERROR, 500);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.DATABASE_ERROR, startedAt });
      return response;
    }

    const response = successResponse({
      id: data.id,
      url: data.url,
      events: data.events,
      secret: data.secret, // Return once during registration
      created_at: data.created_at
    }, 201);
    await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, startedAt });
    return response;

  } catch (err) {
    if (err instanceof z.ZodError) {
      const response = errorResponse("Invalid request", ApiErrorCode.VALIDATION_ERROR, 400, err.format());
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.VALIDATION_ERROR, startedAt });
      return response;
    }
    const response = errorResponse("Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
    await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
    return response;
  }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
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

  let data: any[] = [];
  let error;
  try {
    data = await prisma.api_webhooks.findMany({
      where: { user_id: auth.userId! },
      select: { id: true, url: true, events: true, is_active: true, created_at: true }
    });
  } catch (err) {
    error = err;
  }

  if (error) {
    const response = errorResponse("Failed to fetch webhooks", ApiErrorCode.DATABASE_ERROR, 500);
    await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.DATABASE_ERROR, startedAt });
    return response;
  }

  const response = successResponse({ webhooks: data });

  await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, startedAt });
  return response;
}

export async function OPTIONS() {
  return handlePreflight();
}
