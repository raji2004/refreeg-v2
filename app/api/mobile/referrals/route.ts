import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getReferralDashboardData } from "@/actions/referral-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const data = await getReferralDashboardData();
    return apiSuccess(data);
  } catch (error: any) {
    console.error("Mobile API Get Referrals Error:", error);
    return apiError("Internal server error", 500);
  }
}
