import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/services/mail";
import bcrypt from "bcryptjs";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, accountType, referralCode } = body;

    if (!email || !password) {
      return apiError("Missing required fields (email, password)", 400);
    }

    const normalizedEmail = (email as string).trim().toLowerCase();

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters long", 400);
    }

    // Check if account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return apiError(
        "An account with this email already exists. Please sign in instead.",
        409
      );
    }

    const effectiveFullName =
      fullName && typeof fullName === "string" && fullName.trim().length > 0
        ? fullName.trim()
        : normalizedEmail.split("@")[0];

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      update: {
        password: hashedPassword,
        fullName: effectiveFullName,
        accountType: accountType || "individual",
        referralCode: referralCode || null,
        otpCode,
        expiresAt,
        failedAttempts: 0,
        lastOtpSentAt: new Date(),
      },
      create: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: effectiveFullName,
        accountType: accountType || "individual",
        referralCode: referralCode || null,
        otpCode,
        expiresAt,
        lastOtpSentAt: new Date(),
      },
    });

    const emailResult = await sendOtpEmail({
      email: normalizedEmail,
      userName: effectiveFullName,
      otpCode,
    });

    if (!emailResult.success) {
      console.error("Mobile OTP email dispatch error:", emailResult.error);
      return apiError(
        "Failed to send verification email. Please check your email or try again.",
        500
      );
    }

    return apiSuccess(
      {
        message: "Verification code sent to your email.",
        email: normalizedEmail,
      },
      200
    );
  } catch (error: any) {
    console.error("Mobile API Register Error:", error);
    return apiError("Internal server error", 500);
  }
}
