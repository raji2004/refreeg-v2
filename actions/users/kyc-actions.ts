"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { KycVerification, KycQueueTab, KycQueueItem } from "@/types/kyc-types";
import { logAdminActivity } from "@/actions/admin/database-actions";
import { isAdminOrManager } from "../admin/role-actions";
import { getCurrentUser } from "./auth-actions";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycResubmittedEmail,
  sendKycSubmissionAdminNotification,
  sendKycReminderEmail,
} from "@/services/mail";
import {
  fetchDiditDecision,
  pushDiditStatusUpdate,
  parseDiditSessionId,
  summarizeDecision,
  compareKycRecord,
  buildResubmitNodes,
  type DecisionSummary,
  type RecordCheckRow,
} from "@/lib/didit";
import { resubmitKycSchema } from "@/lib/schemas/kyc-review.schema";
import {
  formatIdTypeLabel,
  kycStatusTabs,
} from "@/lib/options/kyc-review.options";

async function syncManualDiditApproval(kyc: {
  user_id: string;
  document_url: string | null;
}): Promise<boolean> {
  try {
    const sessionId = kyc.document_url?.split(":::")[0];
    if (!sessionId) return false;

    const apiKey =
      process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";
    const diditRes = await fetch(
      `https://verification.didit.me/v3/session/${sessionId}/decision/`,
      { headers: { "x-api-key": apiKey }, cache: "no-store" },
    );
    if (!diditRes.ok) return false;

    const sessionData = await diditRes.json();
    if (sessionData.status?.toLowerCase() !== "approved") return false;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const webhookRes = await fetch(`${appUrl}/api/webhooks/didit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sessionData,
        session_id: sessionData.session_id || sessionData.id || sessionId,
        vendor_data:
          sessionData.vendor_data || sessionData.vendorData || kyc.user_id,
      }),
    });
    return webhookRes.ok;
  } catch (syncError) {
    console.error(
      "[KYC Sync] Error syncing rejected Didit session:",
      syncError,
    );
    return false;
  }
}

export async function getVerificationStatus(
  userId: string,
): Promise<{ status: KycVerification | null; error: string | null }> {
  try {
    let data = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    const isRejectedDidit =
      data?.status === "rejected" && data?.document_type === "didit";

    if (isRejectedDidit && data?.document_url?.includes(":::")) {
      // Reviewers can approve a declined session on Didit after the fact.
      if (await syncManualDiditApproval(data)) {
        const updated = await prisma.kyc_verifications.findUnique({
          where: { id: data.id },
        });
        if (updated) data = updated;
      }
    } else if (
      (data?.status === "pending" || data?.status === "in_progress") &&
      data?.document_type === "didit"
    ) {
      if (data.document_url?.includes(":::")) {
        try {
          const sessionId = data.document_url.split(":::")[0];
          if (sessionId) {
            const apiKey =
              process.env.DIDIT_API_KEY ||
              process.env.DIDIT_CLIENT_SECRET ||
              "";

            const diditRes = await fetch(
              `https://verification.didit.me/v3/session/${sessionId}/decision/`,
              {
                headers: { "x-api-key": apiKey },
                cache: "no-store",
              },
            );

            if (diditRes.ok) {
              const sessionData = await diditRes.json();
              const sessionStatus = sessionData.status?.toLowerCase();

              // If the session has progressed past the initial states, forward it to our webhook
              if (
                sessionStatus &&
                !["not started", "in progress", "pending"].includes(
                  sessionStatus,
                )
              ) {
                console.log(
                  `[KYC Sync] Found updated Didit session ${sessionId} with status ${sessionStatus}, forwarding to webhook...`,
                );
                const appUrl =
                  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

                // Normalize the GET session API response to match the webhook payload shape
                const webhookPayload = {
                  ...sessionData,
                  session_id:
                    sessionData.session_id || sessionData.id || sessionId,
                  vendor_data:
                    sessionData.vendor_data ||
                    sessionData.vendorData ||
                    data.user_id,
                };

                // Simulate the webhook
                const webhookRes = await fetch(`${appUrl}/api/webhooks/didit`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(webhookPayload),
                });

                if (webhookRes.ok) {
                  // Give it a moment to commit, then re-fetch the updated KYC record
                  await new Promise((r) => setTimeout(r, 500));
                  const updated = await prisma.kyc_verifications.findUnique({
                    where: { id: data.id },
                  });
                  if (updated) {
                    data = updated;
                  }
                }
              } else if (
                sessionStatus &&
                ["not started", "in progress", "pending"].includes(
                  sessionStatus,
                )
              ) {
                // The user started the session but closed the window before finishing.
                if (data.id && data.status !== "in_progress") {
                  await prisma.kyc_verifications.update({
                    where: { id: data.id },
                    data: { status: "in_progress" },
                  });
                }
                data.status = "in_progress" as any;
              }
            }
          }
        } catch (syncError) {
          console.error("[KYC Sync] Error syncing Didit session:", syncError);
        }
      } else {
        // Backward compatibility: If the session was saved before we added the UUID format,
        // we can't sync it. Just treat it as in_progress so the user isn't permanently stuck.
        data.status = "in_progress" as any;
      }
    }

    if (data?.document_url) {
      // Clean up the URL if it contains the Didit session UUID
      if (data.document_type === "didit" && data.document_url.includes(":::")) {
        data.document_url =
          data.document_url.split(":::")[1] || data.document_url;
      }

      // Use S3 proxy for generating the URL
      if (
        !data.document_url.startsWith("http") &&
        !data.document_url.startsWith("/api/s3/image")
      ) {
        (data as any).document_url =
          `/api/s3/image?key=${encodeURIComponent(data.document_url)}`;
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
  status: "approved" | "rejected" | "pending",
  notes?: string,
): Promise<{ error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Not authenticated" };

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return { error: "Unauthorized" };

    const verification = await prisma.kyc_verifications.findUnique({
      where: { id: verificationId },
      select: {
        user_id: true,
        full_name: true,
        document_type: true,
        document_url: true,
      },
    });
    if (!verification) {
      return { error: "No verification record found for this id." };
    }

    // Mirror the decision onto Didit so their console and audit trail agree.
    // "pending" is a local undo; Didit has no API to reopen a decision.
    let diditNote = "";
    if (verification.document_type === "didit" && status !== "pending") {
      const sessionId = parseDiditSessionId(verification.document_url);
      if (sessionId) {
        const push = await pushDiditStatusUpdate(
          sessionId,
          status === "approved" ? "Approved" : "Declined",
          { comment: notes },
        );
        diditNote = push.ok
          ? " (Didit synced)"
          : ` (Didit not updated${push.error ? `: ${push.error}` : ""})`;
      } else {
        diditNote = " (Didit not updated: no session id on this row)";
      }
    }
    if (status === "pending") {
      diditNote = " (Didit session left unchanged)";
    }

    const baseNotes =
      status === "pending"
        ? "Decision undone by admin; identity is back in review."
        : notes ||
          (status === "approved" ? "Approved by admin" : "Rejected by admin");

    await prisma.kyc_verifications.update({
      where: { id: verificationId },
      data: {
        status: status,
        verification_notes: `${baseNotes}${diditNote}`,
        updated_at: new Date(),
      },
    });

    if (status === "approved") {
      await logAdminActivity("approve-kyc", user.id);
    } else if (status === "rejected") {
      await logAdminActivity("reject-kyc", user.id);
    } else {
      await logAdminActivity("undo-kyc-decision", user.id);
    }

    try {
      const profile = await prisma.user.findUnique({
        where: { id: verification.user_id },
        select: { email: true },
      });

      if (profile?.email && status !== "pending") {
        if (status === "approved") {
          await sendKycApprovedEmail(
            profile.email,
            verification.full_name || "User",
          );
        } else {
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
    } else {
      await prisma.user.update({
        where: { id: verification.user_id },
        data: { isVerified: false },
      });
    }

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin/users/kyc");
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
      `[KYC Reminder] Emails dispatched. Sent: ${sent}, failed: ${failed}, skipped (already in progress): ${skipped}`,
    );

    await logAdminActivity("send-kyc-reminders", user.id);

    return { sent, failed, skipped, error: null };
  } catch (error) {
    console.error("[KYC Reminder] Unhandled error:", error);
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Something went wrong",
    };
  }
}

// ---------------------------------------------------------------------------
// Admin KYC screens (queue + review detail)
// ---------------------------------------------------------------------------

const QUEUE_PAGE_SIZE = 8;
const QUEUE_ROW_LIMIT = 2000;

type AdminKycRow = {
  id: string;
  user_id: string;
  status: string;
  document_type: string;
  id_type: string | null;
  id_number: string | null;
  face_match_score: number | null;
  checks_passed: number | null;
  checks_total: number | null;
  created_at: Date | null;
  full_name: string | null;
  email: string | null;
  profile_name: string | null;
};

function getTabStatuses(): Record<KycQueueTab, string[]> {
  return Object.fromEntries(
    kycStatusTabs.map((tab) => [tab.value, [...tab.statuses]]),
  ) as Record<KycQueueTab, string[]>;
}

/** Latest verification row per applicant, joined with profile basics. */
async function loadAdminKycRows(): Promise<AdminKycRow[]> {
  return prisma.$queryRaw<AdminKycRow[]>(Prisma.sql`
    SELECT DISTINCT ON (k.user_id)
      k.id, k.user_id, k.status, k.document_type, k.id_type, k.id_number,
      k.face_match_score, k.checks_passed, k.checks_total, k.created_at,
      k.full_name, p.email, p.full_name AS profile_name
    FROM kyc_verifications k
    LEFT JOIN profiles p ON p.id = k.user_id
    ORDER BY k.user_id, k.created_at DESC NULLS LAST, k.updated_at DESC NULLS LAST
    LIMIT ${QUEUE_ROW_LIMIT}
  `);
}

function resolveUserName(
  profile: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    username: string | null;
  } | null,
  kycName: string | null,
): string {
  return (
    profile?.fullName ||
    (profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : null) ||
    profile?.firstName ||
    profile?.displayName ||
    profile?.username ||
    kycName ||
    "Refreegerian"
  );
}

function toQueueItem(row: AdminKycRow): KycQueueItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.full_name || row.profile_name || "Unnamed applicant",
    email: row.email || "",
    status: row.status as KycQueueItem["status"],
    idLabel: formatIdTypeLabel(
      row.document_type === "didit"
        ? row.id_type
        : row.document_type || row.id_type,
    ),
    faceMatchScore: row.face_match_score,
    checksPassed: row.checks_passed,
    checksTotal: row.checks_total,
    submittedAt: (row.created_at ?? new Date(0)).toISOString(),
  };
}

export async function getAdminKycQueue(params: {
  tab?: string;
  search?: string;
  idType?: string;
  faceMatchBelow?: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: KycQueueItem[];
  total: number;
  counts: Record<KycQueueTab, number>;
  nextReviewUserId: string | null;
  error: string | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return queueFailure("Not authenticated");

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return queueFailure("Unauthorized");

    const rows = await loadAdminKycRows();
    const tabStatuses = getTabStatuses();

    const counts: Record<KycQueueTab, number> = {
      "needs-review": 0,
      resubmitted: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of rows) {
      for (const tab of kycStatusTabs) {
        if (tabStatuses[tab.value].includes(row.status)) {
          counts[tab.value] += 1;
        }
      }
    }

    const tab = (
      params.tab && params.tab in tabStatuses ? params.tab : "needs-review"
    ) as KycQueueTab;
    const search = params.search?.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (!tabStatuses[tab].includes(row.status)) return false;
      if (search) {
        const haystack =
          `${row.full_name ?? ""} ${row.profile_name ?? ""} ${row.email ?? ""} ${row.id_number ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (params.idType && params.idType !== "all") {
        const rowIdType = (
          row.document_type === "didit" ? row.id_type : row.document_type
        )?.toLowerCase();
        if (rowIdType !== params.idType.toLowerCase()) return false;
      }
      if (
        params.faceMatchBelow != null &&
        (row.face_match_score == null ||
          row.face_match_score >= params.faceMatchBelow)
      ) {
        return false;
      }
      return true;
    });
    filtered.sort(
      (a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
    );

    const nextReviewRow = rows
      .filter((row) => tabStatuses["needs-review"].includes(row.status))
      .sort(
        (a, b) =>
          (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0),
      )[0];

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(
      50,
      Math.max(1, params.pageSize ?? QUEUE_PAGE_SIZE),
    );
    const items = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(toQueueItem);

    return {
      items,
      total: filtered.length,
      counts,
      nextReviewUserId: nextReviewRow?.user_id ?? null,
      error: null,
    };
  } catch (error) {
    console.error("[KYC Admin] Queue query failed:", error);
    return queueFailure(
      error instanceof Error ? error.message : "Failed to load the KYC queue",
    );
  }
}

function queueFailure(error: string) {
  return {
    items: [] as KycQueueItem[],
    total: 0,
    counts: {
      "needs-review": 0,
      resubmitted: 0,
      approved: 0,
      rejected: 0,
    } as Record<KycQueueTab, number>,
    nextReviewUserId: null,
    error,
  };
}

export async function getAdminKycNeighbors(
  userId: string,
  tab?: string,
): Promise<{
  prevUserId: string | null;
  nextUserId: string | null;
  error: string | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { prevUserId: null, nextUserId: null, error: "Not authenticated" };
    }
    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) {
      return { prevUserId: null, nextUserId: null, error: "Unauthorized" };
    }

    const rows = await loadAdminKycRows();
    const tabStatuses = getTabStatuses();
    const statuses =
      tab && tabStatuses[tab as KycQueueTab]
        ? tabStatuses[tab as KycQueueTab]
        : tabStatuses["needs-review"];
    const ordered = rows
      .filter((row) => statuses.includes(row.status))
      .sort(
        (a, b) =>
          (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
      );

    const index = ordered.findIndex((row) => row.user_id === userId);
    return {
      prevUserId: index > 0 ? ordered[index - 1].user_id : null,
      nextUserId:
        index >= 0 && index < ordered.length - 1
          ? ordered[index + 1].user_id
          : null,
      error: null,
    };
  } catch (error) {
    console.error("[KYC Admin] Neighbor query failed:", error);
    return {
      prevUserId: null,
      nextUserId: null,
      error:
        error instanceof Error ? error.message : "Failed to load neighbors",
    };
  }
}

export async function getAdminKycDetail(userId: string): Promise<{
  kyc: KycVerification | null;
  profile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    createdAt: string | null;
  } | null;
  decision: DecisionSummary | null;
  decisionError: string | null;
  attempts: number;
  recordRows: RecordCheckRow[];
  recordSource: string | null;
  error: string | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return detailFailure("Not authenticated");

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return detailFailure("Unauthorized");

    const rawRow = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    if (!rawRow) {
      return {
        kyc: null,
        profile: null,
        decision: null,
        decisionError: null,
        attempts: 0,
        recordRows: [],
        recordSource: null,
        error: null,
      };
    }

    const [synced, profileRow, attempts] = await Promise.all([
      getVerificationStatus(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      prisma.kyc_verifications.count({ where: { user_id: userId } }),
    ]);

    const kyc: KycVerification | null = synced.status
      ? {
          ...synced.status,
          status: synced.status.status,
        }
      : {
          ...rawRow,
          status: rawRow.status as KycVerification["status"],
          verification_notes: rawRow.verification_notes ?? undefined,
          full_name: rawRow.full_name ?? undefined,
          dob: rawRow.dob ?? undefined,
          phone: rawRow.phone ?? undefined,
          address: rawRow.address ?? undefined,
          city: rawRow.city ?? undefined,
          state: rawRow.state ?? undefined,
          postal: rawRow.postal ?? undefined,
          country: rawRow.country ?? undefined,
          created_at: (rawRow.created_at ?? new Date(0)).toISOString(),
          updated_at: (rawRow.updated_at ?? new Date(0)).toISOString(),
        };

    const profile = profileRow
      ? {
          fullName: profileRow.fullName,
          email: profileRow.email,
          phone: profileRow.phone,
          createdAt: profileRow.createdAt?.toISOString() ?? null,
        }
      : null;

    let decision: DecisionSummary | null = null;
    let decisionError: string | null = null;
    let recordRows: RecordCheckRow[] = [];
    let recordSource: string | null = null;

    if (kyc.document_type === "didit") {
      const sessionId = parseDiditSessionId(rawRow.document_url);
      if (!sessionId) {
        decisionError = "No Didit session id is stored on this record.";
      } else {
        const decisionData = await fetchDiditDecision(sessionId);
        if (decisionData) {
          decision = summarizeDecision(decisionData);
          if (decision.recordCheck) {
            recordRows = decision.recordCheck.rows;
            recordSource = decision.recordCheck.source || "Didit verification";
          } else {
            recordRows = buildFallbackRecordRows(profile, decision);
            recordSource = "Didit verification";
          }
        } else {
          decisionError = "Didit did not respond for this session.";
        }
      }
    }

    if (recordRows.length === 0) {
      recordRows = buildSubmittedOnlyRows(kyc);
      recordSource = recordSource ?? "Submitted details";
    }

    return {
      kyc,
      profile,
      decision,
      decisionError,
      attempts,
      recordRows,
      recordSource,
      error: null,
    };
  } catch (error) {
    console.error("[KYC Admin] Detail query failed:", error);
    return detailFailure(
      error instanceof Error ? error.message : "Failed to load the KYC review",
    );
  }
}

function detailFailure(error: string) {
  return {
    kyc: null,
    profile: null,
    decision: null,
    decisionError: null,
    attempts: 0,
    recordRows: [],
    recordSource: null,
    error,
  };
}

/** Profile-entered name vs Didit's extracted document fields. There is no
 * user-entered DOB anywhere in the app, so only the name row is comparable. */
function buildFallbackRecordRows(
  profile: { fullName: string | null } | null,
  decision: DecisionSummary,
): RecordCheckRow[] {
  const rows: RecordCheckRow[] = [
    {
      field: "Full name",
      submitted: profile?.fullName ?? null,
      official: decision.extracted.fullName,
      result: compareKycRecord(profile?.fullName, decision.extracted.fullName),
    },
  ];
  return rows.filter((row) => row.submitted || row.official);
}

function buildSubmittedOnlyRows(kyc: KycVerification): RecordCheckRow[] {
  const rows: RecordCheckRow[] = [
    {
      field: "Full name",
      submitted: kyc.full_name ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "Date of birth",
      submitted: kyc.dob ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "Phone",
      submitted: kyc.phone ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "Address",
      submitted: kyc.address ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "City",
      submitted: kyc.city ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "State",
      submitted: kyc.state ?? null,
      official: null,
      result: "unknown",
    },
    {
      field: "Country",
      submitted: kyc.country ?? null,
      official: null,
      result: "unknown",
    },
  ];
  return rows.filter((row) => row.submitted);
}

export async function resubmitKycRequest(input: {
  verificationId: string;
  redo: string[];
  message: string;
}): Promise<{ error: string | null; diditSynced: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Not authenticated", diditSynced: false };

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return { error: "Unauthorized", diditSynced: false };

    const parsed = resubmitKycSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error:
          parsed.error.issues[0]?.message ?? "Invalid resubmission request",
        diditSynced: false,
      };
    }

    const kyc = await prisma.kyc_verifications.findUnique({
      where: { id: parsed.data.verificationId },
    });
    if (!kyc) {
      return {
        error: "No verification record found for this id.",
        diditSynced: false,
      };
    }

    // Partial redo on Didit itself when the session exposes node ids;
    // otherwise the applicant starts a fresh session from their settings.
    let diditSynced = false;
    let diditNote = "";
    if (kyc.document_type === "didit") {
      const sessionId = parseDiditSessionId(kyc.document_url);
      if (sessionId) {
        const decisionData = await fetchDiditDecision(sessionId);
        const nodes = buildResubmitNodes(decisionData, parsed.data.redo);
        if (nodes.length > 0) {
          const push = await pushDiditStatusUpdate(sessionId, "Resubmitted", {
            comment: parsed.data.message,
            nodesToResubmit: nodes,
          });
          diditSynced = push.ok;
          if (!push.ok) {
            diditNote = ` (Didit resubmission not applied${push.error ? `: ${push.error}` : ""})`;
          }
        } else {
          diditNote =
            " (Didit node ids unavailable; the applicant starts a new verification session)";
        }
      } else {
        diditNote = " (No Didit session id on this row)";
      }
    }

    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: "resubmitted",
        verification_notes: `Resubmission requested by admin: ${parsed.data.message}${diditNote}`,
        updated_at: new Date(),
      },
    });

    try {
      const profile = await prisma.user.findUnique({
        where: { id: kyc.user_id },
        select: {
          email: true,
          fullName: true,
          firstName: true,
          lastName: true,
          displayName: true,
          username: true,
        },
      });
      if (profile?.email) {
        await sendKycResubmittedEmail(
          profile.email,
          resolveUserName(profile, kyc.full_name),
          parsed.data.message,
        );
      }
    } catch (emailError) {
      console.error("[KYC] Resubmission email failed:", emailError);
    }

    await logAdminActivity("request-kyc-resubmit", user.id);
    revalidatePath("/dashboard/admin/users/kyc");
    revalidatePath(`/dashboard/admin/users/kyc/${kyc.user_id}`);
    return { error: null, diditSynced };
  } catch (error) {
    console.error("[KYC] Unhandled error in resubmitKycRequest:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to send the resubmission request",
      diditSynced: false,
    };
  }
}
