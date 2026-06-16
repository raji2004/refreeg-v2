import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { UpdateCampaignSchema } from "@/utils/api-bot/schemas";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { resolveBankDetails } from "@/utils/api-bot/bank-resolver";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";



export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    campaign = await prisma.api_campaigns.findFirst({
      where: {
        id: params.id,
        developer_id: authRes.userId!,
        mode: authRes.mode!
      }
    });
  } catch (error) {
    console.error("Failed to fetch campaign", error);
  }

  if (!campaign) {
    const response = errorResponse("Campaign not found or access denied", ApiErrorCode.NOT_FOUND, 404);

    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
    return response;
  }

  const response = successResponse(campaign);

  await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
  return response;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    const body = await request.json();
    const result = UpdateCampaignSchema.safeParse(body);
    
    if (!result.success) {
      const response = errorResponse("Invalid updates", ApiErrorCode.VALIDATION_ERROR, 400, result.error.format());

      await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.VALIDATION_ERROR, startedAt });
      return response;
    }

    const data = result.data;
    
    // Support bank updates if provided
    let updateData: any = { ...data };
    
    if (data.bank_id || data.bank_account_number) {
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

      if (bankErr || !bankDetails) {
        const response = errorResponse(bankErr || "Failed to resolve bank details", bankCode as any || ApiErrorCode.INTERNAL_ERROR, bankStatus as any || 500);
        await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: bankCode as any || ApiErrorCode.INTERNAL_ERROR, startedAt });
        return response;
      }

      // Map resolved details to DB fields
      updateData.bank_account_number = bankDetails.bank_account_number;
      updateData.bank_code = bankDetails.bank_code;
      updateData.bank_account_name = bankDetails.bank_account_name;
      updateData.sub_account_code = bankDetails.sub_account_code;
      updateData.bank_account_id = bankDetails.bank_account_id;
      
      // Clean up internal keys
      delete updateData.bank_id;
    }

    let campaign;
    try {
      const existing = await prisma.api_campaigns.findFirst({
        where: { id: params.id, developer_id: authRes.userId!, mode: authRes.mode! }
      });
      
      if (existing) {
        if (updateData.deadline && typeof updateData.deadline === 'string') {
          updateData.deadline = new Date(updateData.deadline);
        }
        campaign = await prisma.api_campaigns.update({
          where: { id: params.id },
          data: updateData
        });
      }
    } catch (e) {
      console.error("Failed to update campaign", e);
    }

    if (!campaign) {
      const response = errorResponse("Campaign not found or access denied", ApiErrorCode.NOT_FOUND, 404);

      await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
      return response;
    }

    const response = successResponse(campaign);

    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
    return response;

  } catch (err) {
    const response = errorResponse("Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
    await logApiRequest({ request, statusCode: response.status, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
    return response;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
        data: { status: "cancelled" }
      });
    }
  } catch (e) {
    console.error("Failed to cancel campaign", e);
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
