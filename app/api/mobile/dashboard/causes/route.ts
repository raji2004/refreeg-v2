import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getUserCausesWithStats } from "@/actions/dashboard-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const causes = await getUserCausesWithStats(user!.id);
    return apiSuccess(causes);
  } catch (error: any) {
    console.error("Mobile API Get Dashboard Causes Error:", error);
    return apiError("Internal server error", 500);
  }
}
