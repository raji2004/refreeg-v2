import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, resetSessionToken, newPassword, password, signOutOtherDevices } = body;

    const effectivePassword = (newPassword || password) as string | undefined;

    if (!resetSessionToken || !effectivePassword) {
      return apiError(
        "Missing required fields (resetSessionToken, newPassword)",
        400
      );
    }

    if (effectivePassword.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    // Verify resetSessionToken HMAC
    const parts = (resetSessionToken as string).split(":");
    if (parts.length !== 3) {
      return apiError("Invalid reset session token", 401);
    }

    const [tokenEmail, tokenTimestamp, tokenHmac] = parts;
    const normalizedEmail = (email ? (email as string).trim().toLowerCase() : tokenEmail);

    if (tokenEmail !== normalizedEmail) {
      return apiError("Token does not match provided email", 401);
    }

    const timestampNum = parseInt(tokenTimestamp, 10);
    const age = Date.now() - timestampNum;
    if (isNaN(age) || age > 15 * 60 * 1000 || age < 0) {
      return apiError("Reset session has expired. Please verify code again.", 401);
    }

    const secret =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "refreeg-auth-secret-key";
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(`${normalizedEmail}:${tokenTimestamp}`)
      .digest("hex");

    if (tokenHmac !== expectedHmac) {
      return apiError("Invalid reset token signature", 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const hashedPassword = await bcrypt.hash(effectivePassword, 10);
    const now = new Date();
    const withdrawalsResumeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          ...(signOutOtherDevices ? { sessions_invalidated_after: now } : {}),
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      }),
    ]);

    return apiSuccess({
      message: "Password reset successfully.",
      withdrawalsResumeAt: withdrawalsResumeAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Mobile API Reset Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
