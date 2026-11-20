import { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { trackLogin, initializeUserWallet } from "@/actions/users/auth-actions";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

function getAllowedAppleAudiences(): string[] {
  const mobileClientId =
    process.env.APPLE_MOBILE_CLIENT_ID?.trim() || "com.refreeg.app";
  const webServiceId = process.env.APPLE_ID?.trim();
  return Array.from(
    new Set([mobileClientId, webServiceId].filter((v): v is string => Boolean(v))),
  );
}

// Apple hashes the client nonce with SHA-256 hex before signing the identity token.
function isValidAppleNonce(tokenNonce: unknown, rawNonce: unknown): boolean {
  const hasTokenNonce = typeof tokenNonce === "string" && tokenNonce.length > 0;
  const hasRawNonce = typeof rawNonce === "string" && rawNonce.trim().length > 0;
  if (!hasTokenNonce && !hasRawNonce) {
    return true;
  }
  if (!hasTokenNonce || !hasRawNonce) {
    return false;
  }

  const expectedHash = createHash("sha256")
    .update(rawNonce.trim())
    .digest("hex");
  const actualBuf = Buffer.from(tokenNonce.toLowerCase(), "utf8");
  const expectedBuf = Buffer.from(expectedHash.toLowerCase(), "utf8");
  return (
    actualBuf.length === expectedBuf.length &&
    timingSafeEqual(actualBuf, expectedBuf)
  );
}

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { identityToken, nonce, fullName, accountType } = body;

    if (typeof identityToken !== "string" || !identityToken.trim()) {
      return apiError("Missing required field (identityToken)", 400);
    }

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(identityToken.trim(), APPLE_JWKS, {
        issuer: "https://appleid.apple.com",
        audience: getAllowedAppleAudiences(),
      });
      payload = verified.payload as Record<string, unknown>;
    } catch {
      return apiError("Invalid Apple identity token", 401);
    }

    if (!isValidAppleNonce(payload.nonce, nonce)) {
      return apiError("Invalid Apple sign-in nonce", 401);
    }

    const appleSub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!appleSub) {
      return apiError("Invalid Apple identity token", 401);
    }

    // Look up existing Apple link first because Apple may omit email and fullName after first sign-in.
    const existingAppleAccount = await prisma.account.findFirst({
      where: {
        provider: "apple",
        providerAccountId: appleSub,
      },
      include: { user: true },
    });

    let user = existingAppleAccount?.user ?? null;

    if (!user) {
      const email =
        typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      if (!email) {
        return apiError("Apple account did not provide an email address", 400);
      }

      if (payload.email_verified !== true && payload.email_verified !== "true") {
        return apiError("Apple email is not verified", 401);
      }

      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const resolvedName =
          typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : "Refreegerian";
        const resolvedAccountType =
          typeof accountType === "string" && accountType.trim()
            ? accountType.trim()
            : null;

        user = await prisma.user.create({
          data: {
            email,
            fullName: resolvedName,
            accountType: resolvedAccountType,
            isVerified: false,
            onboarding_completed: false,
          },
        });

        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "apple",
            providerAccountId: appleSub,
          },
        });

        await initializeUserWallet(user.id);
      } else {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "apple",
            providerAccountId: appleSub,
          },
        });
      }
    }

    if (user.isBlocked) {
      return apiError("Your account has been blocked", 403);
    }

    trackLogin(user.id).catch(console.error);

    const token = await signMobileToken(user.id, user.email ?? "");

    return apiSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountType: user.accountType,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboarding_completed,
      },
    });
  } catch (error: unknown) {
    console.error("Mobile API Apple Login Error:", error);
    return apiError("Internal server error", 500);
  }
}
