import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { requestHumanReview } from "@/lib/kyc/verification-engine";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/kyc/request-review
 * 1-Tap Human Review Escalation.
 * Offered on every failure screen so honest users are never locked out by automated thresholds.
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.kycId) {
      return apiError("Missing kycId", 400);
    }

    const result = await requestHumanReview(user!.id, body.kycId, body.reason);
    if (!result.success) {
      return apiError(result.error || "Failed to request review", 400);
    }

    return apiSuccess({
      success: true,
      outcome: "under_review",
      message: "Your submission has been routed to our review team.",
    });
  } catch (error: any) {
    console.error("Mobile API KYC Request Review Error:", error);
    return apiError(error.message || "Failed to request review", 500);
  }
}

