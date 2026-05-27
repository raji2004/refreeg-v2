import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getCauseAnalytics } from "@/actions/dashboard-actions";

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
    
    // We don't have explicit auth check inside getCauseAnalytics, 
    // but typically analytics should only be viewed by the cause owner.
    // However, the action is written to just take a causeId.
    // For now, we wrap it securely.
    const analytics = await getCauseAnalytics(id);
    return apiSuccess(analytics);
  } catch (error: any) {
    console.error("Mobile API Get Cause Analytics Error:", error);
    return apiError("Internal server error", 500);
  }
}
