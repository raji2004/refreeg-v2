import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { trackLogin, initializeUserWallet } from "@/actions/users/auth-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, accountType } = body;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return apiError("Missing required field (idToken)", 400);
    }

    const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!expectedClientId) {
      console.error("Mobile API Google Login Error: GOOGLE_CLIENT_ID is not configured");
      return apiError("Google sign-in is not configured on the server", 500);
    }

    // Verify the Google ID Token
    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`,
    );
    const googleData = await googleResponse.json();

    if (!googleResponse.ok || !googleData.email) {
      return apiError("Invalid Google ID Token", 401);
    }

    // Reject tokens minted for other Google OAuth apps so third-party tokens cannot log into RefreeG.
    if (googleData.aud !== expectedClientId) {
      console.warn("Mobile API Google Login rejected: audience mismatch");
      return apiError("Invalid Google ID Token", 401);
    }

    if (googleData.email_verified !== true && googleData.email_verified !== "true") {
      return apiError("Google email is not verified", 401);
    }

    const email = (googleData.email as string).trim().toLowerCase();
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
    } else if (googleId) {
      // Ensure existing email/password accounts get linked for cross-platform OAuth consistency
      const existingAccount = await prisma.account.findFirst({
        where: {
          provider: "google",
          OR: [{ userId: user.id }, { providerAccountId: googleId }],
        },
      });

      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleId,
          },
        });
      }
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
