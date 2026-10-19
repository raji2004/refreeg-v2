import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { verifyAccountNumber } from "@/services/payment-provider";
import Paystack from "@/services/paystack";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body as {
      accountNumber?: string;
      bankCode?: string;
    };

    if (!accountNumber || !bankCode) {
      return apiError("Account number and bank code are required", 400);
    }

    // Attempt Paystack verification first
    try {
      const verification = await Paystack.verifyAccountNumber(
        accountNumber,
        bankCode,
      );
      if (verification && verification.account_name) {
        return apiSuccess({
          account_name: verification.account_name,
          account_number: accountNumber,
          bank_id: verification.bank_id,
        });
      }
    } catch (e: any) {
      console.warn(
        "Paystack direct verify failed, attempting payment-provider:",
        e?.message,
      );
    }

    // Fallback to generalized payment-provider verify
    const verification = await verifyAccountNumber(accountNumber, bankCode);
    return apiSuccess(verification);
  } catch (error: any) {
    console.error("Mobile Bank Verify Error:", error);
    return apiError(
      error.message || "Could not resolve bank account details",
      400,
    );
  }
}
