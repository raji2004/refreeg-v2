import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { hasBankDetails, updateBankDetails } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const hasBank = await hasBankDetails(user!.id);
    
    return apiSuccess({
      hasBankDetails: hasBank
    });
  } catch (error: any) {
    console.error("Mobile API Check Bank Details Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    if (!body.accountNumber || !body.bankName || !body.accountName) {
      return apiError("Missing required fields (accountNumber, bankName, accountName)", 400);
    }

    const bankData = {
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      accountName: body.accountName,
      sub_account_code: body.sub_account_code,
    };

    const updatedProfile = await updateBankDetails(user!.id, bankData);
    
    return apiSuccess(updatedProfile);
  } catch (error: any) {
    console.error("Mobile API Update Bank Details Error:", error);
    return apiError("Internal server error", 500);
  }
}
