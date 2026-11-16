/**
 * lib/breet-reconcile.ts
 *
 * Reconciliation backfill for missed Breet webhooks.
 *
 * Why this exists: Breet pays the creator by auto-settlement whether or not
 * our webhook ever fired. The webhook is at-least-once delivery, but events
 * can still be lost for good - Breet retries 7 times over ~25 hours, and if
 * the endpoint keeps failing for 4 hours it is auto-disabled with no replay
 * ("Any events that occur during this time will not be sent later"). A lost
 * trade.completed means a creator got a bank alert while the campaign total
 * never moved. This module lists recent completed trades from Breet and
 * records whatever the webhook missed, using the same attribution rules
 * (parseBreetLabel), dedupe keys (trade id + on-chain txHash) and gross
 * naira figure (amountInUSD × rate) as app/api/webhooks/breet.
 *
 * The orchestrator is dependency-injected so it can be unit-tested without a
 * database; app/api/cron/breet-reconcile wires it to Prisma and the Breet API.
 */

import { breetAssetNetwork, parseBreetLabel } from "@/lib/breet";

export interface BreetTradeSummary {
  id: string;
  status: string;
  txHash: string;
  amountInUSD: number;
  rate: number;
  cryptoAmount: number;
  destinationDescription: string;
  destinationAddress: string;
  senderAddress: string;
  asset: string;
}

export interface ReconcileDeps {
  /** One page of raw trades from Breet's list endpoint. */
  fetchCompletedTrades(page: number): Promise<Record<string, any>[]>;
  /** All stored dedupe keys (tx_hash and tx_signature columns). */
  getRecordedTradeIds(keys: string[]): Promise<Set<string>>;
  causeExists(causeId: string): Promise<boolean>;
  recordDonation(
    trade: BreetTradeSummary,
    causeId: string,
    donorId: string | null,
    amountInNaira: number,
  ): Promise<unknown>;
  syncMilestones(causeId: string): Promise<void>;
}

export interface ReconcileReport {
  pagesFetched: number;
  scanned: number;
  alreadyRecorded: number;
  unattributed: number;
  created: number;
  errors: string[];
}

/** Breet's list payload → normalized trade; null when unusable. */
export function normalizeBreetTrade(raw: any): BreetTradeSummary | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    status: String(raw.status || ""),
    txHash: String(raw.txHash || ""),
    amountInUSD: Number(raw.amountInUSD || 0),
    rate: Number(raw.rate || 0),
    cryptoAmount: Number(raw.cryptoAmount || 0),
    destinationDescription: String(raw.destinationDescription || ""),
    destinationAddress: String(raw.destinationAddress || ""),
    senderAddress: String(raw.senderAddress || raw.sourceAddress || ""),
    asset: String(raw.asset || ""),
  };
}

/** Gross donation figure - same policy as the webhook (not amountSettled). */
export function grossNaira(trade: BreetTradeSummary): number {
  return Math.round(trade.amountInUSD * trade.rate);
}

/** Convenience for route wiring: donation fields derived from a trade. */
export function donationFields(
  trade: BreetTradeSummary,
  amountInNaira: number,
) {
  return {
    amount_in_naira: amountInNaira,
    amount_in_crypto: trade.cryptoAmount,
    status: "completed",
    tx_hash: trade.id || trade.txHash,
    tx_signature: trade.txHash,
    donor_wallet_address: trade.senderAddress || "External Exchange Node",
    recipient_address: trade.destinationAddress || "Breet Liquidity Node",
    network: breetAssetNetwork(trade.asset),
    currency: "USDT",
  };
}

const MAX_PAGES_HARD_CAP = 10;

export async function reconcileBreetTrades(
  deps: ReconcileDeps,
  opts: { maxPages?: number } = {},
): Promise<ReconcileReport> {
  const maxPages = Math.max(
    1,
    Math.min(opts.maxPages ?? 3, MAX_PAGES_HARD_CAP),
  );
  const report: ReconcileReport = {
    pagesFetched: 0,
    scanned: 0,
    alreadyRecorded: 0,
    unattributed: 0,
    created: 0,
    errors: [],
  };

  // 1. Collect completed trades from Breet, newest pages first.
  const trades: BreetTradeSummary[] = [];
  for (let page = 1; page <= maxPages; page++) {
    let rows: Record<string, any>[];
    try {
      rows = await deps.fetchCompletedTrades(page);
    } catch (err: any) {
      report.errors.push(
        `page ${page}: ${err?.message || "trades fetch failed"}`,
      );
      break; // stop paging; still process whatever earlier pages yielded
    }
    report.pagesFetched++;
    for (const row of rows) {
      const trade = normalizeBreetTrade(row);
      if (!trade || trade.status !== "completed") continue;
      trades.push(trade);
    }
    if (rows.length === 0) break; // reached the last page
  }
  report.scanned = trades.length;
  if (trades.length === 0) return report;

  // 2. Fail-safe dedupe: if we cannot check what is already recorded, record
  // nothing - a blind backfill could double-credit campaigns.
  let pending: BreetTradeSummary[];
  try {
    const keys = new Set<string>();
    for (const trade of trades) {
      keys.add(trade.id);
      if (trade.txHash) keys.add(trade.txHash);
    }
    const recorded = await deps.getRecordedTradeIds([...keys]);
    pending = trades.filter(
      (trade) =>
        !recorded.has(trade.id) &&
        !(trade.txHash && recorded.has(trade.txHash)),
    );
    report.alreadyRecorded = trades.length - pending.length;
  } catch (err: any) {
    report.errors.push(
      `dedupe lookup failed: ${err?.message || "error"}; nothing recorded this run`,
    );
    return report;
  }

  // 3. Record the missing ones with the webhook's exact attribution rules.
  for (const trade of pending) {
    try {
      const { donorId, causeId } = parseBreetLabel(
        trade.destinationDescription,
      );
      if (!causeId) {
        report.unattributed++;
        console.error(
          `💥 Reconcile: trade ${trade.id} has no parsable label ("${trade.destinationDescription}"); skipping`,
        );
        continue;
      }
      const exists = await deps.causeExists(causeId);
      if (!exists) {
        report.unattributed++;
        console.error(
          `💥 Reconcile: trade ${trade.id} label "${trade.destinationDescription}" resolved to unknown cause ${causeId}; skipping`,
        );
        continue;
      }
      await deps.recordDonation(trade, causeId, donorId, grossNaira(trade));
      try {
        await deps.syncMilestones(causeId);
      } catch (err: any) {
        report.errors.push(
          `trade ${trade.id}: milestone sync failed: ${err?.message || "error"}`,
        );
      }
      report.created++;
    } catch (err: any) {
      report.errors.push(
        `trade ${trade.id}: ${err?.message || "record failed"}`,
      );
    }
  }
  return report;
}
