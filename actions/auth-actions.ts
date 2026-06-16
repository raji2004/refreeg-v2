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
