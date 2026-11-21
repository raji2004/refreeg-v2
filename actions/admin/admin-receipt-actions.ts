"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import {
  buildReceiptFieldRows,
  receiptLabel,
  receiptMatch,
  receiptTab,
  toAmount,
} from "@/lib/receipts/receipt-check";
import {
  askReceiptInfoSchema,
  rejectReceiptSchema,
  type AskReceiptInfoInput,
  type RejectReceiptInput,
} from "@/lib/schemas/receipt-review.schema";
import type { ReceiptQueueItem, ReceiptQueueTab } from "@/types/receipt-types";

const QUEUE_PATH = "/dashboard/admin/receipts";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

async function requireReviewer(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdminOrManager(userId))) return null;
  return userId;
}

const receiptFieldsSelect = {
  vendor: true,
  receipt_date: true,
  amount: true,
  invoice_number: true,
  read_vendor: true,
  read_date: true,
  read_amount: true,
  read_invoice_number: true,
} as const;

/** Every reviewable receipt with per-tab counts; tabs, search and paging are client state. */
export async function getAdminReceiptQueue(): Promise<{
  items: ReceiptQueueItem[];
  counts: Record<ReceiptQueueTab, number>;
  nextReceiptId: string | null;
  error: string | null;
}> {
  const counts: Record<ReceiptQueueTab, number> = {
    "to-verify": 0,
    mismatch: 0,
    "need-info": 0,
    verified: 0,
  };
  if (!(await requireReviewer())) {
    return { items: [], counts, nextReceiptId: null, error: "Unauthorized" };
  }

  try {
    const rows = await prisma.campaign_proof_updates.findMany({
      where: { status: { in: ["pending", "need_info", "approved"] } },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        receipt_no: true,
        receipt_title: true,
        status: true,
        created_at: true,
        cause: { select: { title: true } },
        ...receiptFieldsSelect,
      },
    });

    const items = rows.flatMap((row): ReceiptQueueItem[] => {
      const match = receiptMatch(buildReceiptFieldRows(row));
      const tab = receiptTab(row.status, match);
      if (!tab) return [];
      counts[tab] += 1;
      return [
        {
          id: row.id,
          label: receiptLabel(row.receipt_no),
          title: row.receipt_title || "Fund-use proof",
          causeTitle: row.cause.title,
          claimed: toAmount(row.amount),
          readAmount: toAmount(row.read_amount),
          match,
          tab,
          submittedAt: row.created_at.toISOString(),
        },
      ];
    });

    const nextReceiptId =
      items.find((item) => item.tab === "to-verify" || item.tab === "mismatch")
        ?.id ?? null;

    return { items, counts, nextReceiptId, error: null };
  } catch (error) {
    console.error("[Receipts Admin] Queue query failed:", error);
    return {
      items: [],
      counts,
      nextReceiptId: null,
      error: "The receipts queue could not be loaded.",
    };
  }
}

export async function getAdminReceiptDetail(receiptId: string) {
  if (!(await requireReviewer())) {
    return { receipt: null, milestoneReceiptIds: [], error: "Unauthorized" };
  }

  const receipt = await prisma.campaign_proof_updates.findUnique({
    where: { id: receiptId },
    include: {
      cause: { select: { id: true, title: true, goal: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!receipt) {
    return {
      receipt: null,
      milestoneReceiptIds: [],
      error: "This receipt doesn't exist or was removed.",
    };
  }

  const milestoneReceipts = await prisma.campaign_proof_updates.findMany({
    where: {
      cause_id: receipt.cause_id,
      milestone: receipt.milestone,
      status: { notIn: ["superseded", "rejected"] },
    },
    orderBy: { created_at: "asc" },
    select: { id: true },
  });

  return {
    receipt,
    milestoneReceiptIds: milestoneReceipts.map((row) => row.id),
    error: null,
  };
}

/** Approve at the given amount: publish the update, satisfy its milestone, lift a compliance pause if nothing else is open. */
export async function verifyReceipt(
  receiptId: string,
  verifiedAmount: number | null,
) {
  if (!(await requireReviewer())) {
    return { success: false, error: "Unauthorized" };
  }

  const receipt = await prisma.campaign_proof_updates.findUnique({
    where: { id: receiptId },
    include: {
      cause: {
        select: {
          id: true,
          title: true,
          compliance_paused: true,
          user: { select: { email: true, fullName: true } },
        },
      },
    },
  });
  if (!receipt || !["pending", "need_info"].includes(receipt.status)) {
    return {
      success: false,
      error: "This receipt was already decided. Refresh the queue.",
    };
  }

  const { pauseLifted } = await prisma.$transaction(async (tx) => {
    await tx.campaign_proof_updates.update({
      where: { id: receiptId },
      data: {
        status: "approved",
        verified_amount: verifiedAmount,
        reviewed_at: new Date(),
      },
    });

    await tx.campaign_proof_requirements.updateMany({
      where: { submitted_update_id: receiptId, status: "submitted" },
      data: {
        status: "satisfied",
        satisfied_at: new Date(),
        last_reminder_at: null,
      },
    });

    const remaining = await tx.campaign_proof_requirements.count({
      where: {
        cause_id: receipt.cause_id,
        status: { in: ["pending", "submitted"] },
      },
    });
    if (remaining > 0 || !receipt.cause.compliance_paused) {
      return { pauseLifted: false };
    }
    await tx.cause.update({
      where: { id: receipt.cause_id },
      data: { compliance_paused: false, compliance_paused_at: null },
    });
    return { pauseLifted: true };
  });

  revalidatePath(`/causes/${receipt.cause_id}`);
  revalidatePath("/causes");
  revalidatePath(QUEUE_PATH);

  const creator = receipt.cause.user;
  const causeUrl = `${APP_URL}/causes/${receipt.cause_id}`;
  try {
    const { sendProofUpdateApprovedEmail, sendProofUpdatePublishedEmail } =
      await import("@/services/mail");
    if (creator?.email) {
      await sendProofUpdateApprovedEmail({
        to: creator.email,
        userName: creator.fullName || "there",
        causeTitle: receipt.cause.title,
        causeUrl,
        pauseLifted,
      });
    }

    const [followers, donors] = await Promise.all([
      prisma.campaign_follows.findMany({
        where: { cause_id: receipt.cause_id },
        select: { email: true },
      }),
      prisma.donation.findMany({
        where: { causeId: receipt.cause_id },
        select: { email: true },
        distinct: ["email"],
      }),
    ]);
    const audience = new Set(
      [...followers, ...donors].map((row) => row.email).filter(Boolean),
    );
    if (creator?.email) audience.delete(creator.email);

    // Fire and forget so the reviewer isn't kept waiting on every donor email.
    for (const email of audience) {
      sendProofUpdatePublishedEmail({
        to: email,
        causeTitle: receipt.cause.title,
        causeUrl,
      }).catch((error) =>
        console.error(`Failed to send published email to ${email}:`, error),
      );
    }
  } catch (error) {
    console.error("[Receipts Admin] Approval emails failed:", error);
  }

  return { success: true, error: null };
}

/** Park the receipt until the creator replies; it is rejected by the proof cron if the reply-by date passes. */
export async function requestReceiptInfo(input: AskReceiptInfoInput) {
  if (!(await requireReviewer())) {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = askReceiptInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { receiptId, reason, message, replyByDays } = parsed.data;

  const receipt = await prisma.campaign_proof_updates.findUnique({
    where: { id: receiptId },
    include: {
      cause: {
        select: {
          title: true,
          user: { select: { email: true, fullName: true } },
        },
      },
    },
  });
  if (!receipt || receipt.status !== "pending") {
    return {
      success: false,
      error: "Only receipts waiting for review can be sent back for info.",
    };
  }

  const now = new Date();
  const replyBy = new Date(now.getTime() + Number(replyByDays) * 86_400_000);
  await prisma.campaign_proof_updates.update({
    where: { id: receiptId },
    data: {
      status: "need_info",
      info_request_reason: reason,
      info_request_message: message,
      info_requested_at: now,
      info_reply_by: replyBy,
    },
  });
  revalidatePath(QUEUE_PATH);

  const creator = receipt.cause.user;
  if (creator?.email) {
    try {
      const { sendReceiptInfoRequestedEmail } = await import("@/services/mail");
      await sendReceiptInfoRequestedEmail({
        to: creator.email,
        userName: creator.fullName || "there",
        causeTitle: receipt.cause.title,
        receiptLabel: receiptLabel(receipt.receipt_no),
        reason,
        message,
        replyBy,
      });
    } catch (error) {
      console.error("[Receipts Admin] Info request email failed:", error);
    }
  }

  return { success: true, error: null };
}

/** Reject: the milestone goes back to pending so the creator must upload a new receipt. */
export async function rejectReceipt(input: RejectReceiptInput) {
  if (!(await requireReviewer())) {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = rejectReceiptSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { receiptId, reason, note } = parsed.data;
  const rejectionReason = note ? `${reason}. ${note}` : reason;

  const receipt = await prisma.campaign_proof_updates.findUnique({
    where: { id: receiptId },
    include: {
      cause: {
        select: {
          title: true,
          user: { select: { email: true, fullName: true } },
        },
      },
    },
  });
  if (!receipt || !["pending", "need_info"].includes(receipt.status)) {
    return {
      success: false,
      error: "This receipt was already decided. Refresh the queue.",
    };
  }

  await prisma.$transaction([
    prisma.campaign_proof_updates.update({
      where: { id: receiptId },
      data: {
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_at: new Date(),
      },
    }),
    prisma.campaign_proof_requirements.updateMany({
      where: { submitted_update_id: receiptId, status: "submitted" },
      data: { status: "pending", submitted_update_id: null },
    }),
  ]);
  revalidatePath(QUEUE_PATH);

  const creator = receipt.cause.user;
  if (creator?.email) {
    try {
      const { sendProofUpdateRejectedEmail } = await import("@/services/mail");
      await sendProofUpdateRejectedEmail({
        to: creator.email,
        userName: creator.fullName || "there",
        causeTitle: receipt.cause.title,
        rejectionReason,
      });
    } catch (error) {
      console.error("[Receipts Admin] Rejection email failed:", error);
    }
  }

  return { success: true, error: null };
}
