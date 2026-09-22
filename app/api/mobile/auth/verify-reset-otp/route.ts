import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otpCode, otp } = body;
    const effectiveOtp = (otpCode || otp) as string | undefined;

    if (!email || !effectiveOtp) {
      return apiError("Email and verification code are required", 400);
    }

    const normalizedEmail = (email as string).trim().toLowerCase();
    const normalizedCode = effectiveOtp.trim();

    const record = await prisma.passwordResetToken.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record) {
      return apiError(
        "No recovery request found for this email. Please request a new code.",
        404
      );
    }

    if (record.expires < new Date()) {
      return apiError(
        "Verification code has expired. Please request a new one.",
        400
      );
    }

    if (record.token !== normalizedCode) {
      return apiError("Invalid verification code. Please check and try again.", 400);
    }

    const secret =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "refreeg-auth-secret-key";
    const timestamp = Date.now().toString();
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(`${normalizedEmail}:${timestamp}`)
      .digest("hex");

    const resetSessionToken = `${normalizedEmail}:${timestamp}:${hmac}`;

    return apiSuccess({
      message: "Verification successful.",
      resetSessionToken,
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error("Mobile API Verify Reset OTP Error:", error);
    return apiError("Internal server error", 500);
  }
}
