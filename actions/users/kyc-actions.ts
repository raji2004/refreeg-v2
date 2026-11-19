"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  AdminKycDetail,
  AdminKycNeighbors,
  AdminKycQueueSnapshot,
  AdminKycRow,
  KycQueueItem,
  KycQueueTab,
  KycVerification,
  PendingReferralRow,
} from "@/types/kyc-types";
import { logAdminActivity } from "@/actions/admin/database-actions";
import { isAdminOrManager } from "../admin/role-actions";
import { getCurrentUser } from "./auth-actions";
import {
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycReminderEmail,
  sendKycResubmittedEmail,
} from "@/services/mail";
import {
  buildResubmitNodes,
  compareKycRecord,
  fetchDiditDecision,
  parseDiditSessionId,
  pushDiditStatusUpdate,
  summarizeDecision,
  type DecisionSummary,
  type RecordCheckRow,
} from "@/lib/didit";
import {
  kycDecisionSchema,
  kycNeighborsSchema,
  kycUserIdSchema,
  resubmitKycSchema,
} from "@/lib/schemas/kyc-review.schema";
import { formatIdTypeLabel, kycTabStatuses } from "@/lib/kyc-review";
import { kycStatusTabs } from "@/lib/options/kyc-review.options";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: "Not authenticated" };
  const isAuthorized = await isAdminOrManager(user.id);
  if (!isAuthorized) return { user: null, error: "Unauthorized" };
  return { user, error: null };
}

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
    const parsedId = kycUserIdSchema.safeParse({ userId });
    if (!parsedId.success) {
      return {
        status: null,
        error: parsedId.error.issues[0]?.message ?? "Invalid user id",
      };
    }

    let data = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    const isRejectedDidit =
      data?.status === "rejected" && data?.document_type === "didit";

    if (isRejectedDidit && data?.document_url?.includes(":::")) {
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

                const webhookPayload = {
                  ...sessionData,
                  session_id:
                    sessionData.session_id || sessionData.id || sessionId,
                  vendor_data:
                    sessionData.vendor_data ||
                    sessionData.vendorData ||
                    data.user_id,
                };

                const webhookRes = await fetch(`${appUrl}/api/webhooks/didit`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(webhookPayload),
                });

                if (webhookRes.ok) {
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
        data.status = "in_progress" as any;
      }
    }

    if (data?.document_url) {
      if (data.document_type === "didit" && data.document_url.includes(":::")) {
        data.document_url =
          data.document_url.split(":::")[1] || data.document_url;
      }

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

async function syncDecisionToDidit(
  verification: {
    document_type: string;
    document_url: string | null;
  },
  status: "approved" | "rejected" | "pending",
  notes?: string,
): Promise<string> {
  if (status === "pending") return " (Didit session left unchanged)";
  if (verification.document_type !== "didit") return "";

  const sessionId = parseDiditSessionId(verification.document_url);
  if (!sessionId) return " (Didit not updated: no session id on this row)";

  const push = await pushDiditStatusUpdate(
    sessionId,
    status === "approved" ? "Approved" : "Declined",
    { comment: notes },
  );
  return push.ok
    ? " (Didit synced)"
    : ` (Didit not updated${push.error ? `: ${push.error}` : ""})`;
}

async function sendDecisionEmail(
  userId: string,
  fullName: string | null,
  status: "approved" | "rejected" | "pending",
  notes?: string,
) {
  if (status === "pending") return;
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!profile?.email) return;

    if (status === "approved") {
      await sendKycApprovedEmail(profile.email, fullName || "User");
    } else {
      await sendKycRejectedEmail(
        profile.email,
        fullName || "User",
        notes ||
          "Your KYC verification was rejected. Please review and resubmit.",
      );
    }
  } catch (emailError) {
    console.error("Error sending KYC status email:", emailError);
  }
}

async function applyVerificationOutcome(userId: string, approved: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: approved },
  });

  if (!approved) return;
  try {
    await issueReferralRewardOnKycApproval(userId);
  } catch (referralError) {
    console.error(
      "[KYC] Referral reward failed after approval:",
      referralError,
    );
  }
}

export async function updateVerificationStatus(
  verificationId: string,
  status: "approved" | "rejected" | "pending",
  notes?: string,
): Promise<{ error: string | null }> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user) return { error };

    const decision = kycDecisionSchema.safeParse({
      verificationId,
      status,
      notes,
    });
    if (!decision.success) {
      return {
        error: decision.error.issues[0]?.message ?? "Invalid decision request",
      };
    }

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

    const diditNote = await syncDecisionToDidit(verification, status, notes);

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

    await logAdminActivity(
      status === "approved"
        ? "approve-kyc"
        : status === "rejected"
          ? "reject-kyc"
          : "undo-kyc-decision",
      user.id,
    );

    await sendDecisionEmail(
      verification.user_id,
      verification.full_name,
      status,
      notes,
    );
    await applyVerificationOutcome(verification.user_id, status === "approved");

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

export async function sendKycReminderToUnverifiedUsers(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  error: string | null;
}> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user) return { sent: 0, failed: 0, skipped: 0, error };

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

const MAX_QUEUE_ROWS = 2000;

const EMPTY_COUNTS = Object.freeze({
  "needs-review": 0,
  resubmitted: 0,
  approved: 0,
  rejected: 0,
}) as Record<KycQueueTab, number>;

async function loadAdminKycRows(): Promise<AdminKycRow[]> {
  return prisma.$queryRaw<AdminKycRow[]>(Prisma.sql`
    SELECT id, user_id, status, document_type, id_type, id_number,
      face_match_score, checks_passed, checks_total, created_at,
      full_name, email, profile_name
    FROM (
      SELECT DISTINCT ON (k.user_id)
        k.id, k.user_id, k.status, k.document_type, k.id_type, k.id_number,
        k.face_match_score, k.checks_passed, k.checks_total, k.created_at,
        k.full_name, p.email, p.full_name AS profile_name
      FROM kyc_verifications k
      LEFT JOIN profiles p ON p.id = k.user_id
      ORDER BY k.user_id, k.created_at DESC NULLS LAST, k.updated_at DESC NULLS LAST
      LIMIT ${MAX_QUEUE_ROWS}
    ) latest
    ORDER BY created_at DESC NULLS LAST
  `);
}

export async function getAdminKycQueueSnapshot(): Promise<AdminKycQueueSnapshot> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user)
      return { items: [], counts: EMPTY_COUNTS, nextReviewUserId: null, error };

    const [rows, statusCounts] = await Promise.all([
      loadAdminKycRows(),
      prisma.$queryRaw<{ status: string; count: number }[]>(Prisma.sql`
        SELECT status, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON (user_id) user_id, status
          FROM kyc_verifications
          ORDER BY user_id, created_at DESC NULLS LAST, updated_at DESC NULLS LAST
          LIMIT ${MAX_QUEUE_ROWS}
        ) latest
        GROUP BY status
      `),
    ]);

    const counts = Object.fromEntries(
      kycStatusTabs.map((tab) => [
        tab.value,
        statusCounts
          .filter((row) => kycTabStatuses[tab.value].includes(row.status))
          .reduce((sum, row) => sum + row.count, 0),
      ]),
    ) as Record<KycQueueTab, number>;

    const items = rows.map((row) => {
      const rawIdType =
        row.document_type === "didit"
          ? row.id_type
          : row.document_type || row.id_type;
      return {
        id: row.id,
        userId: row.user_id,
        name: row.full_name || row.profile_name || "Unnamed applicant",
        email: row.email || "",
        status: row.status as KycQueueItem["status"],
        idLabel: formatIdTypeLabel(rawIdType),
        idType: rawIdType?.toLowerCase() ?? null,
        idNumber: row.id_number,
        faceMatchScore: row.face_match_score,
        checksPassed: row.checks_passed,
        checksTotal: row.checks_total,
        submittedAt: (row.created_at ?? new Date(0)).toISOString(),
      };
    });

    const nextReviewUserId =
      rows
        .filter((row) => kycTabStatuses["needs-review"].includes(row.status))
        .pop()?.user_id ?? null;

    return { items, counts, nextReviewUserId, error: null };
  } catch (error) {
    console.error("[KYC Admin] Queue query failed:", error);
    return {
      items: [],
      counts: EMPTY_COUNTS,
      nextReviewUserId: null,
      error:
        error instanceof Error ? error.message : "Failed to load the KYC queue",
    };
  }
}

export async function getAdminKycNeighbors(
  userId: string,
  tab?: string,
): Promise<AdminKycNeighbors> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user) return { prevUserId: null, nextUserId: null, error };

    const parsedTab = kycNeighborsSchema.safeParse({ userId, tab });
    if (!parsedTab.success) {
      return {
        prevUserId: null,
        nextUserId: null,
        error: parsedTab.error.issues[0]?.message ?? "Invalid request",
      };
    }

    const rows = await loadAdminKycRows();
    const statuses = kycTabStatuses[parsedTab.data.tab ?? "needs-review"];
    const ordered = rows.filter((row) => statuses.includes(row.status));

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

const EMPTY_DETAIL = {
  kyc: null,
  profile: null,
  decision: null,
  decisionError: null,
  attempts: 0,
  recordRows: [] as RecordCheckRow[],
  recordSource: null,
};

export async function getAdminKycDetail(
  userId: string,
): Promise<AdminKycDetail> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user) return { ...EMPTY_DETAIL, error };

    const parsedId = kycUserIdSchema.safeParse({ userId });
    if (!parsedId.success) {
      return {
        ...EMPTY_DETAIL,
        error: parsedId.error.issues[0]?.message ?? "Invalid user id",
      };
    }

    const rawRow = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    if (!rawRow) {
      return { ...EMPTY_DETAIL, error: null };
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
    return {
      ...EMPTY_DETAIL,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load the KYC review",
    };
  }
}

function buildFallbackRecordRows(
  profile: { fullName: string | null } | null,
  decision: DecisionSummary,
): RecordCheckRow[] {
  const row = {
    field: "Full name",
    submitted: profile?.fullName ?? null,
    official: decision.extracted.fullName,
    result: compareKycRecord(profile?.fullName, decision.extracted.fullName),
  };
  return row.submitted || row.official ? [row] : [];
}

function buildSubmittedOnlyRows(kyc: KycVerification): RecordCheckRow[] {
  return Object.entries({
    "Full name": kyc.full_name,
    "Date of birth": kyc.dob,
    Phone: kyc.phone,
    Address: kyc.address,
    City: kyc.city,
    State: kyc.state,
    Country: kyc.country,
  })
    .filter(([, submitted]) => submitted)
    .map(([field, submitted]) => ({
      field,
      submitted: submitted ?? null,
      official: null,
      result: "unknown" as const,
    }));
}

async function syncResubmissionToDidit(
  kyc: { document_type: string; document_url: string | null },
  redo: string[],
  message: string,
): Promise<{ diditSynced: boolean; note: string }> {
  if (kyc.document_type !== "didit") return { diditSynced: false, note: "" };

  const sessionId = parseDiditSessionId(kyc.document_url);
  if (!sessionId) {
    return { diditSynced: false, note: " (No Didit session id on this row)" };
  }

  const decisionData = await fetchDiditDecision(sessionId);
  const nodes = buildResubmitNodes(decisionData, redo);
  if (nodes.length === 0) {
    return {
      diditSynced: false,
      note: " (Didit node ids unavailable; the applicant starts a new verification session)",
    };
  }

  const push = await pushDiditStatusUpdate(sessionId, "Resubmitted", {
    comment: message,
    nodesToResubmit: nodes,
  });
  return push.ok
    ? { diditSynced: true, note: "" }
    : {
        diditSynced: false,
        note: ` (Didit resubmission not applied${push.error ? `: ${push.error}` : ""})`,
      };
}

async function sendResubmissionEmail(
  userId: string,
  kycName: string | null,
  message: string,
) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        displayName: true,
        username: true,
      },
    });
    if (!profile?.email) return;

    const name =
      profile.fullName ||
      (profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : null) ||
      profile.firstName ||
      profile.displayName ||
      profile.username ||
      kycName ||
      "Refreegerian";

    await sendKycResubmittedEmail(profile.email, name, message);
  } catch (emailError) {
    console.error("[KYC] Resubmission email failed:", emailError);
  }
}

export async function resubmitKycRequest(input: {
  verificationId: string;
  redo: string[];
  message: string;
}): Promise<{ error: string | null; diditSynced: boolean }> {
  try {
    const { user, error } = await requireAdminUser();
    if (!user) return { error, diditSynced: false };

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

    const { diditSynced, note } = await syncResubmissionToDidit(
      kyc,
      parsed.data.redo,
      parsed.data.message,
    );

    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: "resubmitted",
        verification_notes: `Resubmission requested by admin: ${parsed.data.message}${note}`,
        updated_at: new Date(),
      },
    });

    await sendResubmissionEmail(
      kyc.user_id,
      kyc.full_name,
      parsed.data.message,
    );

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
