"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { KycVerification, KycStatus } from "@/types/kyc-types";
import { logAdminActivity } from "@/actions/database-actions";
import { isAdminOrManager } from "./role-actions";
import { getCurrentUser } from "./auth-actions";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycSubmissionAdminNotification,
  sendKycReminderEmail,
} from "@/services/mail";


export async function getVerificationStatus(
  userId: string,
): Promise<{ status: KycVerification | null; error: string | null }> {
  try {
    const data = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    if (data?.document_url) {
      // Use S3 proxy for generating the URL
      if (!data.document_url.startsWith("http") && !data.document_url.startsWith("/api/s3/image")) {
        (data as any).document_url = `/api/s3/image?key=${encodeURIComponent(data.document_url)}`;
      }
    }

    return { status: data as KycVerification | null, error: null };
  } catch (error) {
    console.error("Error getting verification status:", JSON.stringify(error));
    return {
      status: null,
      error:
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error) || "Failed to get status",
    };
  }
}

type PendingReferralRow = {
  id_v1: string;
  referrer_id_v1: string;
};

export async function issueReferralRewardOnKycApproval(refereeUserId: string) {
  const referrals = await prisma.$queryRaw<PendingReferralRow[]>(Prisma.sql`
    SELECT id_v1, referrer_id_v1
    FROM referrals_v1
    WHERE referee_id_v1 = CAST(${refereeUserId} AS uuid)
      AND reward_status_v1 = 'PENDING'
    ORDER BY created_at_v1 DESC
    LIMIT 1
  `);

  const referral = referrals[0];
  if (!referral?.referrer_id_v1) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const lockedReferralCount = await tx.$executeRaw(Prisma.sql`
      UPDATE referrals_v1
      SET
        reward_status_v1 = 'ISSUED',
        kyc_verified_v1 = true,
        rewarded_at_v1 = NOW(),
        reward_v1 = '+5 pts'
      WHERE id_v1 = CAST(${referral.id_v1} AS uuid)
        AND reward_status_v1 = 'PENDING'
    `);

    if (lockedReferralCount === 0) {
      return;
    }

    await tx.user.update({
      where: { id: referral.referrer_id_v1 },
      data: {
        total_points: { increment: 5 },
      },
    });

    await tx.rewardTransaction.create({
      data: {
        userId: referral.referrer_id_v1,
        amount: 5,
        transactionType: "referral_bonus",
        status: "completed",
      },
    });
  });
}

export async function updateVerificationStatus(
  verificationId: string,
  status: "approved" | "rejected",
  notes?: string,
): Promise<{ error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Not authenticated" };

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return { error: "Unauthorized" };

    // Update KYC status using Prisma
    await prisma.kyc_verifications.update({
      where: { id: verificationId },
      data: {
        status: status,
        verification_notes:
          notes ||
          (status === "approved" ? "Approved by admin" : "Rejected by admin"),
        updated_at: new Date(),
      },
    });

    if (user) {
      if (status === "approved") {
        await logAdminActivity("approve-kyc", user.id);
      } else if (status === "rejected") {
        await logAdminActivity("reject-kyc", user.id);
      }
    }

    // Fetch the verification record to get user_id and full_name
    const verification = await prisma.kyc_verifications.findUnique({
      where: { id: verificationId },
      select: { user_id: true, full_name: true },
    });

    if (verification) {
      try {
        const profile = await prisma.user.findUnique({
          where: { id: verification.user_id },
          select: { email: true },
        });

        if (profile?.email) {
          if (status === "approved") {
            await sendKycApprovedEmail(
              profile.email,
              verification.full_name || "User",
            );
          } else if (status === "rejected") {
            await sendKycRejectedEmail(
              profile.email,
              verification.full_name || "User",
              notes ||
                "Your KYC verification was rejected. Please review and resubmit.",
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending KYC status email:", emailError);
      }

      // Update is_verified on the user profile
      if (status === "approved") {
        await prisma.user.update({
          where: { id: verification.user_id },
          data: { isVerified: true },
        });

        try {
          await issueReferralRewardOnKycApproval(verification.user_id);
        } catch (referralError) {
          console.error(
            "[KYC] Referral reward failed after approval:",
            referralError,
          );
        }
      } else if (status === "rejected") {
        await prisma.user.update({
          where: { id: verification.user_id },
          data: { isVerified: false },
        });
      }
    } else {
      console.error(
        "[KYC] No verification record found for id:",
        verificationId,
      );
      return { error: "No verification record found for this id." };
    }

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/settings");
    return { error: null };
  } catch (error) {
    console.error("[KYC] Unhandled error in updateVerificationStatus:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : JSON.stringify(error) || "Failed to update status",
    };
  }
}

/**
 * Sends a KYC reminder email to all platform users who have not yet verified
 * their identity and have no pending KYC submission.
 * Restricted to admins and managers.
 */
export async function sendKycReminderToUnverifiedUsers(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  error: string | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return { sent: 0, failed: 0, skipped: 0, error: "Not authenticated" };

    const authorized = await isAdminOrManager(user.id);
    if (!authorized)
      return { sent: 0, failed: 0, skipped: 0, error: "Unauthorized" };

    // Fetch all non-verified users who have a valid email address using Prisma
    const unverifiedProfiles = await prisma.user.findMany({
      where: {
        isVerified: false,
        email: { not: null },
      },
      select: { id: true, email: true, fullName: true },
    });

    if (!unverifiedProfiles || unverifiedProfiles.length === 0) {
      return { sent: 0, failed: 0, skipped: 0, error: null };
    }

    // Fetch user IDs that already have a pending or approved KYC submission
    // so we don't spam users who are already in the process
    const activeKyc = await prisma.kyc_verifications.findMany({
      where: {
        status: { in: ["pending", "approved"] },
      },
      select: { user_id: true },
    });

    const activeUserIds = new Set(activeKyc.map((k) => k.user_id));

    const eligibleUsers = unverifiedProfiles.filter(
      (p) => p.email && !activeUserIds.has(p.id),
    );

    const skipped = unverifiedProfiles.length - eligibleUsers.length;

    if (eligibleUsers.length === 0) {
      return { sent: 0, failed: 0, skipped, error: null };
    }

    // Send reminder emails in parallel, collecting results
    const results = await Promise.allSettled(
      eligibleUsers.map((profile) =>
        sendKycReminderEmail(
          profile.email as string,
          profile.fullName || "Refreegerian",
        ),
      ),
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any)?.success !== false,
    ).length;
    const failed = results.length - sent;

    console.log(
      `[KYC Reminder] Emails dispatched — sent: ${sent}, failed: ${failed}, skipped (already in progress): ${skipped}`,
    );

    await logAdminActivity("send-kyc-reminders", user.id);

    return { sent, failed, skipped, error: null };
  } catch (error) {
    console.error("[KYC Reminder] Unhandled error:", error);
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}
