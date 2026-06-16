import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { CreateCampaignSchema } from "@/utils/api-bot/schemas";
import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { dispatchWebhook } from "@/utils/api-bot/webhook-utils";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { resolveBankDetails } from "@/utils/api-bot/bank-resolver";
import { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";




export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) {
    await logApiRequest({ request, statusCode: 429, errorCode: "rate_limited", startedAt });
    return limitRes.errorResponse;
  }

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) {
    await logApiRequest({ request, statusCode: 401, errorCode: "unauthorized", startedAt });
    return authRes.errorResponse;
  }

  try {
    const body = await request.json();
    const result = CreateCampaignSchema.safeParse(body);
    
    if (!result.success) {
      const response = errorResponse("Invalid request payload", ApiErrorCode.VALIDATION_ERROR, 400, result.error.format());

      await logApiRequest({ 
        request, 
        statusCode: response.status, 
        apiKeyId: authRes.apiKeyId, 
        userId: authRes.userId, 
        mode: authRes.mode, 
        errorCode: ApiErrorCode.VALIDATION_ERROR, 
        startedAt 
      });
      return response;
    }
    
    const data = result.data;
    const { bankDetails, error: bankErr, code: bankCode, status: bankStatus } = await resolveBankDetails(
      authRes.userId!,
      authRes.mode,
      {
        bank_id: data.bank_id,
        bank_account_number: data.bank_account_number,
        bank_code: data.bank_code,
        bank_account_name: data.bank_account_name,
        title: data.title
      }
    );

    if (bankErr) {
      const response = errorResponse(bankErr, bankCode as any, bankStatus as any);
      await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: bankCode as any, startedAt });
      return response;
    }

    if (!bankDetails) {
      return errorResponse("Internal error: Could not resolve bank details", ApiErrorCode.INTERNAL_ERROR, 500);
    }

    let campaign;
    try {
      campaign = await prisma.api_campaigns.create({
        data: {
          developer_id: authRes.userId!,
          api_key_id: authRes.apiKeyId,
          title: data.title,
          description: data.description,
          goal_amount: data.goal_amount,
          payout_mode: data.payout_mode,
          deadline: data.deadline ? new Date(data.deadline) : null,
          bank_account_number: bankDetails.bank_account_number!,
          bank_code: bankDetails.bank_code!,
          bank_account_name: bankDetails.bank_account_name!,
          sub_account_code: bankDetails.sub_account_code,
          bank_account_id: bankDetails.bank_account_id,
          mode: authRes.mode!,
          status: "active",
          currency: "NGN",
          raised_amount: 0
        }
      });
    } catch (e) {
      console.error("Failed to create campaign", e);
    }

    if (!campaign) {
      const response = errorResponse("Failed to create campaign", ApiErrorCode.INTERNAL_ERROR, 500);

      await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
      return response;
    }

    dispatchWebhook(authRes.userId!, "campaign.created", campaign).catch(console.error);

    const response = successResponse(campaign, 201);

    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
    return response;

  } catch (err: any) {
    const response = errorResponse("Invalid JSON format", ApiErrorCode.BAD_REQUEST, 400);

    await logApiRequest({ request, statusCode: response.status, errorCode: ApiErrorCode.BAD_REQUEST, startedAt });
    return response;
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) {
    await logApiRequest({ request, statusCode: 429, errorCode: "rate_limited", startedAt });
    return limitRes.errorResponse;
  }

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) {
    await logApiRequest({ request, statusCode: 401, errorCode: "unauthorized", startedAt });
    return authRes.errorResponse;
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  
  let campaigns = [];
  let count = 0;
  try {
    const whereClause = {
      developer_id: authRes.userId!,
      mode: authRes.mode!
    };
    
    [campaigns, count] = await Promise.all([
      prisma.api_campaigns.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.api_campaigns.count({ where: whereClause })
    ]);
  } catch (error) {
    const response = errorResponse("Failed to fetch campaigns", ApiErrorCode.INTERNAL_ERROR, 500);

    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
    return response;
  }

  const response = paginatedResponse(campaigns, count || 0, limit, offset);

  await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
  return response;
}

export async function OPTIONS() {
  return handlePreflight();
}
