import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getPetitionAnalytics } from "@/actions/dashboard-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    
    const analytics = await getPetitionAnalytics(id);
    return apiSuccess(analytics);
  } catch (error: any) {
    console.error("Mobile API Get Petition Analytics Error:", error);
    return apiError("Internal server error", 500);
  }
}
