import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { hasBankDetails, isProfileComplete } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const [hasBankInfo, profileStatus] = await Promise.all([
      hasBankDetails(user!.id),
      isProfileComplete(user!.id),
    ]);

    return apiSuccess({
      canCreate: hasBankInfo && profileStatus.isComplete,
      hasBankDetails: hasBankInfo,
      isProfileComplete: profileStatus.isComplete,
      missingFields: profileStatus.missingFields,
    });
  } catch (error: any) {
    console.error("Mobile API Cause Eligibility Error:", error);
    return apiError("Internal server error", 500);
  }
}
