import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getUserWallet } from "@/actions/event-reward-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const walletData = await getUserWallet(user!.id);
    return apiSuccess(walletData);
  } catch (error: any) {
    console.error("Mobile API Get Wallet Error:", error);
    return apiError("Internal server error", 500);
  }
}
