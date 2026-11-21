import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuthorized } from "@/lib/api/cron-auth";
import {
  sendProofCausePausedEmail,
  sendProofUpdateRejectedEmail,
  sendProofUpdateReminderEmail,
} from "@/services/mail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const now = new Date();
  let pausedCount = 0;
  let remindedCount = 0;

  // 0. EXPIRE: receipts sent back for info with no reply by the deadline are rejected.
  const expiredReceipts = await prisma.campaign_proof_updates.findMany({
    where: { status: "need_info", info_reply_by: { lt: now } },
    select: {
      id: true,
      cause: {
        select: {
          title: true,
          user: { select: { email: true, fullName: true } },
        },
      },
    },
  });
  const expiredReason =
    "No reply to our information request by the deadline, so the funds stay in escrow.";
  for (const receipt of expiredReceipts) {
    await prisma.$transaction([
      prisma.campaign_proof_updates.update({
        where: { id: receipt.id },
        data: {
          status: "rejected",
          rejection_reason: expiredReason,
          reviewed_at: now,
        },
      }),
      prisma.campaign_proof_requirements.updateMany({
        where: { submitted_update_id: receipt.id, status: "submitted" },
        data: { status: "pending", submitted_update_id: null },
      }),
    ]);
    if (!receipt.cause.user?.email) continue;
    try {
      await sendProofUpdateRejectedEmail({
        to: receipt.cause.user.email,
        userName: receipt.cause.user.fullName || "there",
        causeTitle: receipt.cause.title,
        rejectionReason: expiredReason,
      });
    } catch (e) {
      console.error("Expired receipt email failed:", e);
    }
  }

  // 1. PAUSE: Find pending requirements past their 7-day deadline
  const overdueReqs = await prisma.campaign_proof_requirements.findMany({
    where: { status: "pending", deadline: { lt: now } },
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

  const causesToPause = new Map<string, any>();
  for (const r of overdueReqs) {
    if (!r.cause.compliance_paused) causesToPause.set(r.cause.id, r.cause);
  }

  if (causesToPause.size > 0) {
    await prisma.cause.updateMany({
      where: { id: { in: [...causesToPause.keys()] } },
      data: { compliance_paused: true, compliance_paused_at: now },
    });
  }

  for (const cause of causesToPause.values()) {
    if (cause.user?.email) {
      try {
        await sendProofCausePausedEmail({
          to: cause.user.email,
          userName: cause.user.fullName || "there",
          causeTitle: cause.title,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com"}/dashboard/causes`,
        });
      } catch (e) {
        console.error("Paused email failed:", e);
      }
    }
    pausedCount++;
  }

  // 2. REMIND: Find pending requirements due within 48h (respecting a 2-day cooldown)
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const cooldown = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const upcomingReqs = await prisma.campaign_proof_requirements.findMany({
    where: {
      status: "pending",
      deadline: { gt: now, lte: in48h },
      OR: [{ last_reminder_at: null }, { last_reminder_at: { lt: cooldown } }],
    },
    include: {
      cause: {
        select: {
          title: true,
          user: { select: { email: true, fullName: true } },
        },
      },
    },
  });

  for (const r of upcomingReqs) {
    if (!r.cause.user?.email) continue;
    try {
      await sendProofUpdateReminderEmail({
        to: r.cause.user.email,
        userName: r.cause.user.fullName || "there",
        causeTitle: r.cause.title,
        milestone: r.milestone,
        deadline: r.deadline.toDateString(),
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com"}/dashboard/causes`,
      });
      await prisma.campaign_proof_requirements.update({
        where: { id: r.id },
        data: { last_reminder_at: now },
      });
      remindedCount++;
    } catch (e) {
      console.error("Reminder email failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    expiredReceipts: expiredReceipts.length,
    paused: pausedCount,
    reminded: remindedCount,
  });
}
