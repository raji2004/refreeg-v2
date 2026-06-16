import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuthorized } from "@/lib/cron-auth";

/**
 * Daily job (Next.js): email reminders for pledges due today that are NOT
 * card-authorized (legacy / reminder-only). Authorized pledges are charged via
 * POST /api/cron/pledge-charges.
 *
 * Also sends follower “campaign expiring in ~2 days” emails.
 */
async function runPledgeReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Prisma queries for pledges
  const pledges = await prisma.pledges.findMany({
    where: {
      reminder_date: {
        equals: today,
      },
      status: "pending",
      paystack_payment_status: {
        not: "authorized",
      },
    },
  });

  // Manually fetch related causes since there is no Prisma relation defined on pledges
  const causeIds = [...new Set(pledges.map((p) => p.cause_id))];
  const causesMap = new Map<string, { title: string; id: string }>();
  if (causeIds.length > 0) {
    const causes = await prisma.cause.findMany({
      where: { id: { in: causeIds } },
      select: { id: true, title: true },
    });
    causes.forEach((c) => causesMap.set(c.id, c));
  }

  const pledgesWithCauses = pledges.map((pledge) => ({
    ...pledge,
    causes: causesMap.get(pledge.cause_id) || { title: "Unknown Cause", id: pledge.cause_id },
  }));

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.refreeg.com";

  let sent = 0;
  let failed = 0;

  for (const pledge of pledgesWithCauses) {
    try {
      const res = await fetch(`${appUrl}/api/mail/pledge-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pledge }),
      });
      if (res.ok) {
        sent++;
      } else {
        console.error(
          `Failed to send reminder for pledge ${pledge.id}:`,
          await res.text(),
        );
        failed++;
      }
    } catch (err) {
      console.error(`Error sending reminder for pledge ${pledge.id}:`, err);
      failed++;
    }
  }

  // Handle expiring campaigns
  const expiringCampaigns = await prisma.cause.findMany({
    where: { status: "verified" },
    select: {
      id: true,
      title: true,
      raised: true,
      goal: true,
      createdAt: true,
      daysActive: true,
    },
  });

  if (expiringCampaigns.length > 0) {
    for (const cause of expiringCampaigns) {
      if (!cause.daysActive || !cause.createdAt) continue;

      const createdAt = new Date(cause.createdAt);
      const expiryDate = new Date(createdAt);
      expiryDate.setDate(createdAt.getDate() + cause.daysActive);

      const diffTime = expiryDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 2) {
        const followers = await prisma.campaign_follows.findMany({
          where: { cause_id: cause.id },
          select: { email: true },
        });

        if (followers && followers.length > 0) {
          const followerEmails = followers.map((f) => f.email);
          const amountRaised = Number(cause.raised || 0);
          const goalAmount = Number(cause.goal || 0);
          const percent =
            goalAmount > 0
              ? Math.round((amountRaised / goalAmount) * 100)
              : 0;

          await fetch(`${appUrl}/api/mail/follower-update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "expiring",
              data: {
                followers: followerEmails,
                causeTitle: cause.title,
                causeUrl: `${appUrl}/causes/${cause.id}`,
                amountRaised,
                goalAmount,
                percent,
              },
            }),
          });
        }
      }
    }
  }

  return {
    today: today.toISOString().split("T")[0],
    pledgeReminders: { total: pledges.length, sent, failed },
  };
}

export async function POST(request: NextRequest) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const result = await runPledgeReminders();
    return NextResponse.json(result);
  } catch (e) {
    console.error("pledge-reminders cron error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** Some schedulers use GET; treat like POST. */
export async function GET(request: NextRequest) {
  return POST(request);
}
