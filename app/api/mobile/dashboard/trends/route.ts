import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getDonationTrends } from "@/actions/dashboard-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "30") as "7" | "30" | "90" | "365";
    
    if (!["7", "30", "90", "365"].includes(range)) {
      return apiError("Invalid range. Must be 7, 30, 90, or 365", 400);
    }

    const trends = await getDonationTrends(user!.id);
    return apiSuccess(trends);
  } catch (error: any) {
    console.error("Mobile API Get Donation Trends Error:", error);
    return apiError("Internal server error", 500);
  }
}
