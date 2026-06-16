import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { CreateBankSchema } from "@/utils/api-bot/schemas";
import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";



export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) return limitRes.errorResponse;

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) return authRes.errorResponse;

  try {
    const body = await request.json();
    const result = CreateBankSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse("Invalid bank details", ApiErrorCode.VALIDATION_ERROR, 400, result.error.format());
    }
    
    const data = result.data;

    // Optional: Verify with Paystack by creating a test subaccount or just verifying the account
    let subAccountCode: string | null = null;
    try {
      const subAccount = await Paystack.createSubaccount({
        business_name: `Dev Bank Verification ${Date.now()}`,
        bank_code: data.bank_code,
        account_number: data.bank_account_number,
        percentage_charge: 2
      });
      subAccountCode = subAccount.subaccount_code;
    } catch (err: any) {
      return errorResponse("Could not verify bank details with provider", ApiErrorCode.PAYMENT_SETUP_FAILED, 400);
    }

    let bankAccount;
    let error;
    try {
      bankAccount = await prisma.api_bank_accounts.create({
        data: {
          developer_id: authRes.userId!,
          bank_account_number: data.bank_account_number,
          bank_code: data.bank_code,
          bank_account_name: data.bank_account_name,
          sub_account_code: subAccountCode,
          mode: authRes.mode!
        }
      });
    } catch (err) {
      error = err;
    }

    if (error || !bankAccount) {
      return errorResponse("Failed to save bank account", ApiErrorCode.INTERNAL_ERROR, 500);
    }

    await logApiRequest({ request, statusCode: 201, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
    return successResponse(bankAccount, 201);

  } catch (err: any) {
    return errorResponse("Invalid JSON", ApiErrorCode.BAD_REQUEST, 400);
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const limitRes = rateLimit(request);
  if (limitRes?.errorResponse) return limitRes.errorResponse;

  const authRes = await validateApiKey(request);
  if (authRes.errorResponse) return authRes.errorResponse;

  let accounts: any[] = [];
  let error;
  try {
    accounts = await prisma.api_bank_accounts.findMany({
      where: {
        developer_id: authRes.userId!,
        mode: authRes.mode!
      },
      orderBy: { created_at: "desc" }
    });
  } catch (err) {
    error = err;
  }

  if (error) {
    return errorResponse("Failed to fetch bank accounts", ApiErrorCode.INTERNAL_ERROR, 500);
  }

  await logApiRequest({ request, statusCode: 200, apiKeyId: authRes.apiKeyId, userId: authRes.userId, mode: authRes.mode, startedAt });
  return successResponse(accounts);
}

export async function OPTIONS() {
  return handlePreflight();
}
