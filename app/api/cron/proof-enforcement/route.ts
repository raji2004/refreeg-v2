import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendProofCausePausedEmail,
  sendProofUpdateReminderEmail,
} from "@/services/mail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Secure the cron endpoint
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let pausedCount = 0;
  let remindedCount = 0;

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

  for (const [causeId, cause] of causesToPause.entries()) {
    await prisma.cause.update({
      where: { id: causeId },
      data: { compliance_paused: true, compliance_paused_at: now },
    });

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
    paused: pausedCount,
    reminded: remindedCount,
  });
}
