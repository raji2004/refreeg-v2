import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getVerificationStatus } from "@/actions/kyc-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/mobile/kyc
 * Returns the current KYC verification status for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const status = await getVerificationStatus(user!.id);
    return apiSuccess(status);
  } catch (error: any) {
    console.error("Mobile API Get KYC Status Error:", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * POST /api/mobile/kyc
 * 
 * Creates a Didit hosted verification session for the authenticated mobile user.
 * The Flutter app should open the returned `verification_url` in a WebView or
 * use the Didit Flutter SDK with the `session_id`.
 * 
 * Request body (optional):
 *   { "callback_url": "refreeg://kyc/callback" }
 * 
 * Response:
 *   { "success": true, "data": { "session_id": "...", "verification_url": "..." } }
 * 
 * After the user completes verification in Didit, the result is delivered
 * asynchronously via the Didit webhook (POST /api/webhooks/didit).
 * The mobile app should poll GET /api/mobile/kyc to check for status updates.
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    // Check if user already has an approved KYC
    const existingKyc = await prisma.kyc_verifications.findFirst({
      where: { user_id: user!.id },
      orderBy: { created_at: "desc" },
    });

    if (existingKyc?.status === "approved") {
      return apiError("KYC already approved", 409);
    }

    if (existingKyc?.status === "pending") {
      return apiError(
        "A KYC verification is already in progress. Please wait for the result or check your status.",
        409
      );
    }

    // Parse optional callback_url from request body
    let callbackUrl = "refreeg://kyc/callback"; // Default deep link for Flutter
    try {
      const body = await request.json();
      if (body.callback_url && typeof body.callback_url === "string") {
        callbackUrl = body.callback_url;
      }
    } catch {
      // Body is optional — use default callback
    }

    // Create a Didit verification session
    const apiKey =
      process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";

    const diditResponse = await fetch(
      "https://verification.didit.me/v3/session/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          workflow_id: process.env.DIDIT_WORKFLOW_ID || "",
          callback: callbackUrl,
          vendor_data: user!.id,
        }),
      }
    );

    if (!diditResponse.ok) {
      const errorText = await diditResponse.text();
      console.error("Didit session creation error:", errorText);
      return apiError("Failed to create verification session", 502);
    }

    const diditData = await diditResponse.json();
    const sessionId = diditData.session_id;
    const verificationUrl =
      diditData.url ||
      `https://verification.didit.me/v3/session/${sessionId}`;

    return apiSuccess(
      {
        session_id: sessionId,
        verification_url: verificationUrl,
      },
      201
    );
  } catch (error: any) {
    console.error("Mobile API Create KYC Session Error:", error);
    return apiError("Internal server error", 500);
  }
}
