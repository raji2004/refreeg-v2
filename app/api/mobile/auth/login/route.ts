import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { trackLogin } from "@/actions/auth-actions";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Missing required fields (email, password)", 400);
    }

    const normalizedEmail = (email as string).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return apiError("No account found with this email address.", 404);
    }

    if (!user.password) {
      return apiError(
        "This account was created using Google Sign-In. Please sign in with Google.",
        400,
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return apiError("Incorrect password. Please try again.", 401);
    }

    if (user.isBlocked) {
      return apiError("Your account has been blocked", 403);
    }

    // Track login for rewards/streaks (fire and forget)
    trackLogin(user.id).catch(console.error);

    // Generate token
    const token = await signMobileToken(user.id, user.email!);

    return apiSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountType: user.accountType,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboarding_completed
      }
    });
  } catch (error: any) {
    console.error("Mobile API Login Error:", error);
    return apiError("Internal server error", 500);
  }
}
