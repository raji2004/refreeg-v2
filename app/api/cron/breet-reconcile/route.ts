import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { createCryptoDonation } from "@/actions/crypto-actions";
import { syncMilestoneRequirements } from "@/lib/proof-milestones";
import { fetchBreetTradesPage } from "@/lib/breet";
import { donationFields, reconcileBreetTrades } from "@/lib/breet-reconcile";

export const dynamic = "force-dynamic";

/**
 * Reconciliation backfill: record trade.completed events from Breet that the
 * webhook missed (long outage, 4-hour auto-disable, deploy bug). Breet pays
 * the creator regardless, so this keeps crypto_donations and campaign totals
 * in step with reality. Uses the webhook's attribution + dedupe rules and
 * never moves money - Breet auto-settlement already paid the creator.
 */
async function runReconcile(maxPages?: number) {
  return reconcileBreetTrades(
    {
      fetchCompletedTrades: (page) => fetchBreetTradesPage(page),
      getRecordedTradeIds: async (keys) => {
        if (keys.length === 0) return new Set<string>();
        const rows = await prisma.crypto_donations.findMany({
          where: {
            OR: [{ tx_hash: { in: keys } }, { tx_signature: { in: keys } }],
          },
          select: { tx_hash: true, tx_signature: true },
        });
        const recorded = new Set<string>();
        rows.forEach((row) => {
          if (row.tx_hash) recorded.add(row.tx_hash);
          if (row.tx_signature) recorded.add(row.tx_signature);
        });
        return recorded;
      },
      causeExists: async (causeId) =>
        Boolean(
          await prisma.cause.findUnique({
            where: { id: causeId },
            select: { id: true },
          }),
        ),
      recordDonation: (trade, causeId, donorId, amountInNaira) =>
        createCryptoDonation({
          cause_id: causeId,
          user_id: donorId,
          ...donationFields(trade, amountInNaira),
        }),
      syncMilestones: (causeId) => syncMilestoneRequirements(causeId),
    },
    { maxPages },
  );
}

export async function POST(request: NextRequest) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const pagesParam = Number(
      new URL(request.url).searchParams.get("pages") || "0",
    );
    const maxPages =
      Number.isFinite(pagesParam) && pagesParam > 0 ? pagesParam : undefined;

    const report = await runReconcile(maxPages);
    console.log("breet-reconcile report:", JSON.stringify(report));
    if (report.errors.length > 0) {
      console.error("breet-reconcile errors:", report.errors);
    }
    return NextResponse.json(report);
  } catch (e) {
    console.error("breet-reconcile cron error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** Vercel cron and most schedulers use GET; treat like POST. */
export async function GET(request: NextRequest) {
  return POST(request);
}
