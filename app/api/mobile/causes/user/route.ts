import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getUserCausesWithStatus } from "@/actions/cause-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const causes = await getUserCausesWithStatus(user!.id, status);
    
    return apiSuccess(causes);
  } catch (error: any) {
    console.error("Mobile API Get User Causes Error:", error);
    return apiError("Internal server error", 500);
  }
}
