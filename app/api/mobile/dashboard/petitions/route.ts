import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getUserPetitionsWithStats } from "@/actions/dashboard-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const petitions = await getUserPetitionsWithStats(user!.id);
    return apiSuccess(petitions);
  } catch (error: any) {
    console.error("Mobile API Get Dashboard Petitions Error:", error);
    return apiError("Internal server error", 500);
  }
}
