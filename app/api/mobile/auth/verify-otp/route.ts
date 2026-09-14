import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/auth/jwt";
import { createReferralRecord } from "@/lib/referral-utils";

const SIGNUP_EIZA_BONUS = 150;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otpCode } = body;

    if (!email || !otpCode) {
      return apiError("Email and OTP are required", 400);
    }

    const normalizedEmail = (email as string).trim().toLowerCase();
    const trimmedOtp = (otpCode as string).trim();

    // 1. Fetch pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      return apiError("No pending registration found for this email.", 404);
    }

    // 2. Check failed attempts
    if (pending.failedAttempts >= 5) {
      await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }).catch(() => {});
      return apiError("Too many failed attempts. Please sign up again.", 429);
    }

    // 3. Check expiration
    if (new Date() > pending.expiresAt) {
      await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }).catch(() => {});
      return apiError("Verification code has expired. Please request a new one.", 400);
    }

    // 4. Validate OTP
    if (pending.otpCode !== trimmedOtp) {
      const newAttempts = pending.failedAttempts + 1;
      if (newAttempts >= 5) {
        await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }).catch(() => {});
        return apiError("Too many failed attempts. Please sign up again.", 429);
      }
      await prisma.pendingRegistration.update({
        where: { email: normalizedEmail },
        data: { failedAttempts: newAttempts },
      });
      return apiError(
        `Invalid verification code. ${5 - newAttempts} attempt(s) remaining.`,
        400
      );
    }

    // 5. Create user and delete pending registration atomically
    const newProfile = await prisma.$transaction(async (tx) => {
      const nameParts = pending.fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      const profile = await tx.user.create({
        data: {
          email: pending.email,
          password: pending.password,
          fullName: pending.fullName,
          firstName,
          lastName,
          accountType: pending.accountType || "individual",
          emailVerified: new Date(),
          isVerified: false,
          onboarding_completed: false,
          total_points: SIGNUP_EIZA_BONUS,
        },
      });

      if (pending.referralCode) {
        await createReferralRecord({
          referralCode: pending.referralCode,
          newUserId: profile.id,
          email: profile.email as string,
        });
      }

      await tx.pendingRegistration.delete({
        where: { email: normalizedEmail },
      });

      return profile;
    });

    // 6. Generate mobile auth token
    const token = await signMobileToken(newProfile.id, newProfile.email!);

    return apiSuccess(
      {
        token,
        user: {
          id: newProfile.id,
          email: newProfile.email,
          fullName: newProfile.fullName,
          accountType: newProfile.accountType,
          profilePhoto: newProfile.profilePhoto,
          isVerified: newProfile.isVerified,
          onboardingCompleted: newProfile.onboarding_completed,
        },
      },
      200
    );
  } catch (error: any) {
    console.error("Mobile Verify OTP error:", error);
    return apiError("Internal server error during verification.", 500);
  }
}
