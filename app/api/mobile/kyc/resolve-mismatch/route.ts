import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { resolveKycNameMismatch } from "@/lib/kyc/verification-engine";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/kyc/resolve-mismatch
 * Resolves K7 · Name mismatch:
 * - action: "adopt_id_name" (adopts the exact name on NIN/ID into legal profile name)
 * - action: "different_id" (restarts Step 2 with a different ID card)
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "adopt_id_name";

    if (action !== "adopt_id_name" && action !== "different_id") {
      return apiError("Invalid resolution action", 400);
    }

    const result = await resolveKycNameMismatch(user!.id, action);
    if (!result.success) {
      return apiError(result.error || "Failed to resolve name mismatch", 400);
    }

    return apiSuccess(result);
  } catch (error: any) {
    console.error("Mobile API KYC Resolve Mismatch Error:", error);
    return apiError(error.message || "Failed to resolve mismatch", 500);
  }
}

