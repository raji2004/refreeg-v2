"use server";

import { recordEvent, updateUserStreaks } from "@/actions/event-reward-actions";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmailToUser,
} from "@/services/mail";
import { subscribeToConvertKit } from "@/services/convertkit";
import crypto from "crypto";

/**
 * Get the current user
 * Cached to prevent multiple fetch calls during a single request/render.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
});

/**
 * Whether the signed-in user has a password set — false for a Google-only
 * signup. Drives whether Settings > Account asks for a current password
 * before allowing a change (see updatePasswordAction below).
 */
export async function getHasPasswordAction() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  return !!user?.password;
}

export async function signUpAction(
  email: string,
  password: string,
  fullName: string,
  accountType?: "individual" | "organization" | null,
) {
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return {
        success: false,
        error: "A user with that email already exists.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new profile record
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        accountType,
      },
    });

    // Handle post-signup routines asynchronously
    try {
      const firstName = fullName.split(" ")[0];
      await subscribeToConvertKit({
        email,
        first_name: firstName,
        fields: {
          account_type: accountType || "not_selected",
          signup_date: new Date().toISOString(),
        },
      });

      const profileSetupUrl = `${process.env.NEXTAUTH_URL}/dashboard/settings`;
      await sendWelcomeEmailToUser(email, fullName, profileSetupUrl);
    } catch (e) {
      console.error("Post-signup external actions failed:", e);
    }

    // You can handle initial wallets/rewards here using prisma later.

    return { success: true };
  } catch (error) {
    console.error("Error creating user from session:", error);
    return { success: false, error: "Database error" };
  }
}


/**
 * Track user login and update streaks
 */
export async function trackLogin(userId: string) {
  try {
    // Record login event for rewards
    await recordEvent({
      type: "login",
      userId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    // Update user streaks
    await updateUserStreaks(userId);
  } catch (error) {
    console.error("Error tracking login:", error);
    // Don't throw - login tracking shouldn't break authentication
  }
}
/**
 * Initialize wallet for new user with signup bonus
 */
export async function initializeUserWallet(
  userId: string,
  signupBonus: number = 0,
) {
  try {
    const existingWallet = await prisma.userWallet.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (existingWallet) {
      // Wallet already exists, don't initialize again
      return existingWallet;
    }

    // Create wallet (signup bonus handled separately)
    const newWallet = await prisma.userWallet.create({
      data: {
        userId,
        balance: signupBonus,
      }
    });

    // Initialize user streaks
    await prisma.userStreak.create({
      data: {
        userId,
        weeklyStreak: 0,
        isMonthlyActive: false,
        lastActiveDate: new Date(),
      }
    });

    return newWallet;
  } catch (error) {
    console.error("Error in initializeUserWallet:", error);
    // Don't throw - wallet initialization shouldn't break signup
  }
}

/**
 * Record a one-time signup reward transaction
 */
export async function recordSignupReward(userId: string, amount: number = 1) {
  try {
    const existingReward = await prisma.rewardTransaction.findFirst({
      where: { userId, transactionType: "signup" },
      select: { id: true }
    });

    if (existingReward) {
      return existingReward;
    }

    const newReward = await prisma.rewardTransaction.create({
      data: {
        userId,
        amount,
        transactionType: "signup",
        status: "completed",
      }
    });

    // Update user's wallet balance
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
      select: { balance: true }
    });

    const currentBalance = Number(wallet?.balance || 0);
    const newBalance = currentBalance + amount;

    await prisma.userWallet.upsert({
      where: { userId },
      update: { balance: newBalance },
      create: { userId, balance: newBalance }
    });

    return newReward;
  } catch (error) {
    console.error("Error in recordSignupReward:", error);
  }
}

export async function requestPasswordResetAction(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return { success: false, error: "No account found with this email address." };
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in DB
    await prisma.passwordResetToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires },
    });

    // Use AUTH_URL from env, default to localhost if not set
    const baseUrl = process.env.AUTH_URL?.replace("/api/auth", "") || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/update-password?token=${token}`;

    await sendPasswordResetEmail({
      email,
      resetUrl,
    });

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, error: "Failed to send reset link" };
  }
}

export async function resetPasswordAction(token: string, password: string) {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expires < new Date()) {
      return { success: false, error: "Invalid or expired token" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: "Failed to reset password" };
  }
}

/**
 * Sets or changes the signed-in user's password. If the account already has
 * one (vs. a Google-only signup with password: null), the current password
 * must be verified first — this runs from Settings, not the logged-out
 * token-based reset-password flow above, so there's no token to prove intent.
 */
export async function updatePasswordAction(
  currentPassword: string | null,
  newPassword: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to do this." };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (user?.password) {
      const matches =
        !!currentPassword &&
        (await bcrypt.compare(currentPassword, user.password));
      if (!matches) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, error: "Failed to update password" };
  }
}

const EMAIL_CHANGE_MAX_ATTEMPTS = 3;
const emailChangeAttempts = new Map<string, number>();

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Starts an email change: verifies password, stores a confirmation token, and
 * emails a link to the *new* address. Current email stays active until confirm.
 */
export async function requestEmailChangeAction(
  newEmailRaw: string,
  password: string,
): Promise<
  | { success: true }
  | {
      success: false;
      error: string;
      code?: "bad_password" | "no_password" | "taken" | "same" | "invalid";
      attemptsLeft?: number;
    }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to do this." };
  }

  const userId = session.user.id;
  const newEmail = newEmailRaw.trim().toLowerCase();

  if (!isValidEmail(newEmail)) {
    return {
      success: false,
      error: "Enter a valid email address.",
      code: "invalid",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      password: true,
      fullName: true,
    },
  });

  if (!user) {
    return { success: false, error: "Account not found." };
  }

  if (!user.password) {
    return {
      success: false,
      error:
        "Set a password in Security first — we need it to confirm email changes.",
      code: "no_password",
    };
  }

  if (newEmail === (user.email ?? "").toLowerCase()) {
    return {
      success: false,
      error: "That is already your email address.",
      code: "same",
    };
  }

  const failed = emailChangeAttempts.get(userId) ?? 0;
  if (failed >= EMAIL_CHANGE_MAX_ATTEMPTS) {
    return {
      success: false,
      error: "Too many incorrect password attempts. Try again later.",
      code: "bad_password",
      attemptsLeft: 0,
    };
  }

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    const nextFailed = failed + 1;
    emailChangeAttempts.set(userId, nextFailed);
    const attemptsLeft = Math.max(0, EMAIL_CHANGE_MAX_ATTEMPTS - nextFailed);
    return {
      success: false,
      error:
        attemptsLeft > 0
          ? `That password is not right. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
          : "That password is not right. No attempts left.",
      code: "bad_password",
      attemptsLeft,
    };
  }

  emailChangeAttempts.delete(userId);

  const taken = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (taken) {
    return {
      success: false,
      error: "That email is already used by another account.",
      code: "taken",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const identifier = `email-change:${userId}:${newEmail}`;

  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: `email-change:${userId}:` } },
  });

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const baseUrl =
    process.env.AUTH_URL?.replace("/api/auth", "") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const confirmUrl = `${baseUrl}/auth/confirm-email-change?token=${token}`;

  const { sendEmailChangeConfirmEmail } = await import("@/services/mail");
  await sendEmailChangeConfirmEmail({
    email: newEmail,
    userName: user.fullName?.split(" ")[0] || "there",
    newEmail,
    confirmUrl,
  });

  return { success: true };
}

export async function confirmEmailChangeAction(token: string): Promise<{
  success: boolean;
  error?: string;
  email?: string;
}> {
  if (!token) {
    return { success: false, error: "Missing confirmation token." };
  }

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      return {
        success: false,
        error: "This confirmation link is invalid or has expired.",
      };
    }

    if (!record.identifier.startsWith("email-change:")) {
      return { success: false, error: "Invalid confirmation token." };
    }

    const parts = record.identifier.split(":");
    const userId = parts[1];
    const newEmail = parts.slice(2).join(":").toLowerCase();

    if (!userId || !newEmail) {
      return { success: false, error: "Invalid confirmation token." };
    }

    const taken = await prisma.user.findFirst({
      where: { email: newEmail, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
      return {
        success: false,
        error: "That email is already used by another account.",
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerified: new Date(),
        },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return { success: true, email: newEmail };
  } catch (error) {
    console.error("Confirm email change error:", error);
    return { success: false, error: "Failed to confirm email change." };
  }
}
