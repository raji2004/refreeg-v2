import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { trackLogin, initializeUserWallet } from "@/actions/auth-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, accountType } = body;

    if (!idToken) {
      return apiError("Missing required field (idToken)", 400);
    }

    // Verify the Google ID Token
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const googleData = await googleResponse.json();

    if (!googleResponse.ok || !googleData.email) {
      return apiError("Invalid Google ID Token", 401);
    }

    const email = googleData.email;
    const name = googleData.name || "Google User";
    const picture = googleData.picture || null;
    const googleId = googleData.sub; // The unique ID from Google

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a new user for Google Sign In
      user = await prisma.user.create({
        data: {
          email,
          fullName: name,
          profilePhoto: picture,
          accountType: accountType || null,
          isVerified: false,
          onboarding_completed: false,
        },
      });

      // Link the Google account (NextAuth compatible format)
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googleId,
        }
      });

      // Initialize wallet for new user
      await initializeUserWallet(user.id);
    }

    if (user.isBlocked) {
      return apiError("Your account has been blocked", 403);
    }

    // Track login for rewards/streaks
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
    console.error("Mobile API Google Login Error:", error);
    return apiError("Internal server error", 500);
  }
}
