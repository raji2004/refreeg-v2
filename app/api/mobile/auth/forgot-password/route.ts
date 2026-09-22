import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/services/mail";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return apiError("Missing required field (email)", 400);
    }

    const normalizedEmail = (email as string).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true, username: true },
    });

    if (!user) {
      return apiError("No account found with this email address.", 404);
    }

    // Generate 6-digit OTP code expiring in 15 minutes
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.upsert({
      where: { email: normalizedEmail },
      update: {
        token: otpCode,
        expires,
      },
      create: {
        email: normalizedEmail,
        token: otpCode,
        expires,
      },
    });

    const displayName =
      user.fullName || user.username || normalizedEmail.split("@")[0];

    await sendOtpEmail({
      email: normalizedEmail,
      userName: displayName,
      otpCode,
    });

    return apiSuccess({
      message: "Recovery verification code sent to your email.",
    });
  } catch (error: any) {
    console.error("Mobile API Forgot Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
