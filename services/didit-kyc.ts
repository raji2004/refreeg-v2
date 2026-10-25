import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycResubmittedEmail,
  sendKycSubmissionAdminNotification,
} from "@/services/mail";
import { createNotification } from "@/lib/notifications/notification-service";
import { issueReferralRewardOnKycApproval } from "@/lib/referral-utils";

export interface ProcessDiditResultOptions {
  sessionId?: string;
  status?: string;
  vendorData?: string;
  payload?: any;
}

export interface ProcessDiditResultResponse {
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
  alreadyProcessed?: boolean;
}

/**
 * Normalizes and processes verification results from Didit.
 * Can be called by:
 * 1. Webhook endpoint (/api/webhooks/didit)
 * 2. Background sync / polling fallback (getVerificationStatus in kyc-actions)
 *
 * Ensures:
 * - Proper session matching (session ID first, never hijacked by stale sessions)
 * - Atomic state transition (idempotency, prevents duplicate emails/notifications)
 * - Session abandonment tracking (no lost audit records)
 */
export async function processDiditVerificationResult(
  body: any,
): Promise<ProcessDiditResultResponse> {
  const sessionId =
    body.session_id ||
    body.id ||
    body.session ||
    (body.data && body.data.id) ||
    (body.data && body.data.session_id);

  const status = body.status || (body.data && body.data.status);

  const vendorData =
    body.vendor_data ||
    body.vendorData ||
    (body.data && body.data.vendor_data) ||
    (body.data && body.data.vendorData);

  if (!sessionId) {
    console.error("[Didit Service] Missing session_id in payload:", body);
    return {
      success: false,
      error: "Missing session_id",
      status: 400,
    };
  }

  // 1. Primary lookup: Match by session ID (exact or prefix in document_url)
  let kyc = await prisma.kyc_verifications.findFirst({
    where: {
      document_type: "didit",
      OR: [
        { document_url: { startsWith: `${sessionId}:::` } },
        { document_url: sessionId },
      ],
    },
    orderBy: { created_at: "desc" },
  });

  // 2. Fallback lookup: If not found by session ID, search by vendorData for pending/resubmitted records
  if (!kyc && vendorData) {
    kyc = await prisma.kyc_verifications.findFirst({
      where: {
        user_id: vendorData,
        document_type: "didit",
        status: { in: ["pending", "resubmitted", "in_progress"] },
      },
      orderBy: { created_at: "desc" },
    });
  }

  let isNewRecord = false;
  if (!kyc) {
    if (vendorData) {
      const user = await prisma.user.findUnique({
        where: { id: vendorData },
      });
      if (user) {
        isNewRecord = true;
        kyc = await prisma.kyc_verifications.create({
          data: {
            user_id: user.id,
            document_type: "didit",
            document_url: sessionId,
            status: "pending",
            verification_notes:
              "Automated verification processed via Didit service",
            full_name:
              (user as any).full_name || (user as any).fullName || "Didit User",
          },
        });
      }
    }

    if (!kyc) {
      return {
        success: false,
        error: "KYC record not found and could not be created",
        status: 404,
      };
    }
  }

  // If already in terminal state and not newly created, return early (idempotent guard)
  if (
    kyc.status !== "pending" &&
    kyc.status !== "resubmitted" &&
    kyc.status !== "in_progress" &&
    !isNewRecord
  ) {
    return {
      success: true,
      message: "Already processed",
      alreadyProcessed: true,
      status: 200,
    };
  }

  const lowerStatus = status?.toLowerCase() || "";
  const isApproved = lowerStatus === "approved" || lowerStatus === "verified";
  const isRejected = lowerStatus === "declined" || lowerStatus === "rejected";
  const isResubmitted = lowerStatus === "resubmitted";
  const isExpired = lowerStatus === "expired" || lowerStatus === "abandoned";

  // Mark expired/abandoned sessions as 'abandoned' to maintain audit trail
  if (isExpired && (kyc.status === "pending" || kyc.status === "in_progress")) {
    console.log(
      `[Didit] Marking session as abandoned for user ${kyc.user_id} (session: ${sessionId})`,
    );
    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: "abandoned",
        verification_notes: "Session expired or abandoned in Didit",
      },
    });
    return {
      success: true,
      message: "Session marked as abandoned",
      status: 200,
    };
  }

  const rejectionReason =
    body.decision_reason ||
    body.reason ||
    body.message ||
    "Your document or selfie did not meet our verification requirements.";

  let newStatus = "pending";
  if (isApproved) newStatus = "approved";
  if (isRejected) newStatus = "rejected";
  if (isResubmitted) newStatus = "resubmitted";

  const requiresManualReview =
    lowerStatus.includes("review") || lowerStatus === "pending";

  const webhookData = body.data || body;
  const dob =
    webhookData.date_of_birth ||
    webhookData.dob ||
    body.date_of_birth ||
    body.dob;
  const address = webhookData.address || body.address;
  const city = webhookData.city || body.city;
  const state =
    webhookData.state || webhookData.region || body.state || body.region;
  const country = webhookData.country || body.country;
  const postal =
    webhookData.postal_code || webhookData.zip || body.postal_code || body.zip;
  const phone = webhookData.phone || body.phone;
  const firstName = webhookData.first_name || body.first_name;
  const lastName = webhookData.last_name || body.last_name;

  let fullName = kyc.full_name;
  if (firstName && lastName) {
    fullName = `${firstName} ${lastName}`;
  } else if (webhookData.full_name || body.full_name) {
    fullName = webhookData.full_name || body.full_name;
  }

  // ATOMIC CLAIM: Update only if status is still pending or resubmitted.
  // If concurrent requests arrive, only ONE will update rows (count > 0).
  const updateResult = await prisma.kyc_verifications.updateMany({
    where: {
      id: kyc.id,
      status: { in: ["pending", "resubmitted", "in_progress"] },
    },
    data: {
      status: newStatus,
      verification_notes: `Automated Didit result: ${status}${isRejected || isResubmitted ? ` - ${rejectionReason}` : ""}`,
      ...(fullName && fullName !== "Didit User" && { full_name: fullName }),
      ...(dob && { dob }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(country && { country }),
      ...(postal && { postal }),
      ...(phone && { phone }),
    },
  });

  // If another process claimed/updated it first, exit without firing duplicate side effects
  if (updateResult.count === 0 && !isNewRecord) {
    return {
      success: true,
      message: "Already processed",
      alreadyProcessed: true,
      status: 200,
    };
  }

  // Update user verification state
  await prisma.user.update({
    where: { id: kyc.user_id },
    data: { isVerified: isApproved },
  });

  // Send side effects (emails, notifications, rewards) exactly once
  const userProfile = await prisma.user.findUnique({
    where: { id: kyc.user_id },
    select: { email: true },
  });

  if (userProfile?.email) {
    const userName = fullName || kyc.full_name || "User";

    try {
      if (isApproved) {
        await sendKycApprovedEmail(userProfile.email, userName);
        try {
          await issueReferralRewardOnKycApproval(kyc.user_id);
        } catch (err) {
          console.error("[Didit Service] Referral reward error:", err);
        }
        try {
          await createNotification({
            userId: kyc.user_id,
            title: "Identity Verified",
            message:
              "Your RefreeG identity verification has been approved. You now have full Tier 2 access.",
            type: "general",
            data: {
              kyc_status: "approved",
              session_id: sessionId,
            },
          });
        } catch (notifErr) {
          console.error(
            "[Didit Service] Failed to create KYC approval notification:",
            notifErr,
          );
        }
      } else if (isRejected) {
        await sendKycRejectedEmail(
          userProfile.email,
          userName,
          rejectionReason,
        );
        try {
          await createNotification({
            userId: kyc.user_id,
            title: "Verification Needs Attention",
            message:
              rejectionReason ||
              "Your identity verification could not be approved. Please review requirements and try again.",
            type: "general",
            data: {
              kyc_status: "rejected",
              session_id: sessionId,
            },
          });
        } catch (notifErr) {
          console.error(
            "[Didit Service] Failed to create KYC rejection notification:",
            notifErr,
          );
        }
      } else if (isResubmitted) {
        await sendKycResubmittedEmail(
          userProfile.email,
          userName,
          rejectionReason,
        );
        try {
          await createNotification({
            userId: kyc.user_id,
            title: "Action Required: Verification Update",
            message:
              rejectionReason ||
              "Your verification requires a few corrections. Please review the requirements in RefreeG.",
            type: "general",
            data: {
              kyc_status: "resubmitted",
              session_id: sessionId,
            },
          });
        } catch (notifErr) {
          console.error(
            "[Didit Service] Failed to create KYC resubmitted notification:",
            notifErr,
          );
        }
      } else if (newStatus === "pending" && requiresManualReview) {
        await sendKycSubmittedEmail(userProfile.email, userName);
        await sendKycSubmissionAdminNotification(
          userProfile.email,
          userName,
          kyc.user_id,
          "https://verification.didit.me/admin",
        );
        try {
          await createNotification({
            userId: kyc.user_id,
            title: "Verification Under Review",
            message:
              "We have received your verification documents and are reviewing them. We'll notify you once processed.",
            type: "general",
            data: {
              kyc_status: "pending",
              session_id: sessionId,
            },
          });
        } catch (notifErr) {
          console.error(
            "[Didit Service] Failed to create KYC pending review notification:",
            notifErr,
          );
        }
      }
    } catch (emailError) {
      console.error(
        "[Didit Service] Failed to send KYC emails, but DB was updated:",
        emailError,
      );
    }
  }

  try {
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/settings", "layout");
  } catch (e) {
    console.error("[Didit Service] Failed to revalidate paths:", e);
  }

  return { success: true, status: 200 };
}
