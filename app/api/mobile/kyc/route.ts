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
 * Creates or resumes a Didit verification session for the authenticated mobile user.
 * - If user has an active pending session (< 15 min) and `force_new` is false,
 *   reuses that session to save cost and allow user to continue.
 * - If creating a new session, marks previous pending sessions as 'abandoned'
 *   to preserve audit history.
 * - Rejects if user is already approved (409).
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Check if user already has an approved KYC
    const existingKyc = await prisma.kyc_verifications.findFirst({
      where: { user_id: user!.id },
      orderBy: { created_at: "desc" },
    });

    if (existingKyc?.status === "approved") {
      return apiError("KYC already approved", 409);
    }

    // Cost saving: If a pending session exists, reuse it unless force_new is requested.
    // Didit manages expiration natively via webhooks (Expired/Abandoned status).
    if (
      existingKyc?.status === "pending" &&
      !body.force_new &&
      existingKyc.document_url
    ) {
      const parts = existingKyc.document_url.split(":::");
      const existingSessionId = parts[0];
      const existingUrl =
        parts[1] ||
        `https://verification.didit.me/v3/session/${existingSessionId}`;

      if (existingSessionId) {
        return apiSuccess(
          {
            session_id: existingSessionId,
            session_token: "",
            verification_url: existingUrl,
            resumed: true,
          },
          200,
        );
      }
    }

    // Mark old pending sessions as abandoned before creating a new one (preserves audit trail)
    await prisma.kyc_verifications.updateMany({
      where: {
        user_id: user!.id,
        status: "pending",
      },
      data: {
        status: "abandoned",
        verification_notes: "Superseded by new verification session",
      },
    });

    // Parse optional callback_url from request body
    let callbackUrl = "refreeg://kyc/callback"; // Default deep link for Flutter
    if (body.callback_url && typeof body.callback_url === "string") {
      callbackUrl = body.callback_url;
    }

    // Create a new Didit verification session
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
      },
    );

    if (!diditResponse.ok) {
      const errorText = await diditResponse.text();
      console.error("Didit session creation error:", errorText);
      return apiError("Failed to create verification session", 502);
    }

    const diditData = await diditResponse.json();
    const sessionId = diditData.session_id;
    const sessionToken = diditData.session_token || diditData.token || "";
    const verificationUrl =
      diditData.url || `https://verification.didit.me/v3/session/${sessionId}`;

    // Record session in database so it is tracked
    await prisma.kyc_verifications.create({
      data: {
        user_id: user!.id,
        document_type: "didit",
        document_url: `${sessionId}:::${verificationUrl}`,
        status: "pending",
        verification_notes: "Session initialized via RefreeG mobile app",
        full_name: user!.fullName || "RefreeG User",
      },
    });

    return apiSuccess(
      {
        session_id: sessionId,
        session_token: sessionToken,
        verification_url: verificationUrl,
      },
      201,
    );
  } catch (error: any) {
    console.error("Mobile API Create KYC Session Error:", error);
    return apiError("Internal server error", 500);
  }
}
