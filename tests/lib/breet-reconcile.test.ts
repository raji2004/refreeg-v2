/**
 * tests/lib/breet-reconcile.test.ts
 *
 * Unit tests for the reconciliation backfill: label attribution (shared with
 * the webhook), trade normalization, the gross-naira figure and the
 * orchestrator's dedupe / attribution / fail-safe behavior. All Breet and
 * database access is injected, so no network or Prisma is involved.
 */

import { breetAssetNetwork, parseBreetLabel } from "@/lib/breet";
import {
  donationFields,
  grossNaira,
  normalizeBreetTrade,
  reconcileBreetTrades,
  type BreetTradeSummary,
  type ReconcileDeps,
} from "@/lib/breet-reconcile";

describe("parseBreetLabel", () => {
  it("parses a plain donorId_causeId label from the end", () => {
    expect(parseBreetLabel("user123_cause456")).toEqual({
      donorId: "user123",
      causeId: "cause456",
    });
  });

  it("maps guest to a null donor", () => {
    expect(parseBreetLabel("guest_cause456")).toEqual({
      donorId: null,
      causeId: "cause456",
    });
  });

  it("survives Breet's merchant-reference prefix", () => {
    expect(parseBreetLabel("Partner_B-LBNS1M85_user123_cause456")).toEqual({
      donorId: "user123",
      causeId: "cause456",
    });
  });

  it("returns nulls for empty or single-segment labels", () => {
    expect(parseBreetLabel("")).toEqual({ donorId: null, causeId: null });
    expect(parseBreetLabel("noSeparator")).toEqual({
      donorId: null,
      causeId: null,
    });
    expect(parseBreetLabel(null)).toEqual({ donorId: null, causeId: null });
  });
});

describe("breetAssetNetwork", () => {
  it("maps TRON, Ethereum and default (Solana) assets", () => {
    expect(breetAssetNetwork("USDT_TRC20")).toBe("TRON Mainnet");
    expect(breetAssetNetwork("USDT_ERC20")).toBe("Ethereum Mainnet");
    expect(breetAssetNetwork("USDT_B7ZDHS8D_TOR7")).toBe("Solana Mainnet");
  });
});

const TRADE_ROW = {
  id: "692f91aa729255932afe9078",
  status: "completed",
  txHash: "aa801188ukdjfhdbf3771",
  amountInUSD: 21.5,
  rate: 1600,
  cryptoAmount: 0.00025406,
  destinationDescription: "Partner_B-LBNS1M85_user123_cause456",
  destinationAddress: "6DKYpZfd86BUDTjPe4E3",
  senderAddress: "bc1qf43tdrym26qlz8rg",
  asset: "USDT_B7ZDHS8D_TOR7",
};

describe("normalizeBreetTrade", () => {
  it("normalizes a full trade row", () => {
    const trade = normalizeBreetTrade(TRADE_ROW);
    expect(trade).toMatchObject({
      id: "692f91aa729255932afe9078",
      status: "completed",
      amountInUSD: 21.5,
      rate: 1600,
    });
    expect(trade!.senderAddress).toBe("bc1qf43tdrym26qlz8rg");
  });

  it("falls back to sourceAddress when senderAddress is absent", () => {
    const trade = normalizeBreetTrade({
      ...TRADE_ROW,
      senderAddress: undefined,
      sourceAddress: "legacy-src",
    });
    expect(trade!.senderAddress).toBe("legacy-src");
  });

  it("returns null when the row has no id", () => {
    expect(normalizeBreetTrade({ status: "completed" })).toBeNull();
    expect(normalizeBreetTrade(null)).toBeNull();
  });

  it("defaults missing numbers and strings safely", () => {
    const trade = normalizeBreetTrade({ id: "abc" });
    expect(trade).toMatchObject({
      status: "",
      amountInUSD: 0,
      rate: 0,
      destinationDescription: "",
    });
  });
});

describe("grossNaira", () => {
  it("uses amountInUSD × rate, rounded", () => {
    expect(grossNaira(normalizeBreetTrade(TRADE_ROW)!)).toBe(34400);
    expect(
      grossNaira(
        normalizeBreetTrade({ id: "x", amountInUSD: 100, rate: 1605.4 })!,
      ),
    ).toBe(160540);
  });
});

describe("donationFields", () => {
  it("mirrors the webhook's record shape", () => {
    const trade = normalizeBreetTrade(TRADE_ROW)!;
    expect(donationFields(trade, 34400)).toMatchObject({
      amount_in_naira: 34400,
      amount_in_crypto: 0.00025406,
      status: "completed",
      tx_hash: "692f91aa729255932afe9078",
      tx_signature: "aa801188ukdjfhdbf3771",
      donor_wallet_address: "bc1qf43tdrym26qlz8rg",
      recipient_address: "6DKYpZfd86BUDTjPe4E3",
      network: "Solana Mainnet",
      currency: "USDT",
    });
  });
});

type Calls = {
  recorded: {
    tradeId: string;
    causeId: string;
    donorId: string | null;
    amount: number;
  }[];
  milestones: string[];
};

function makeDeps(
  overrides: Partial<ReconcileDeps> = {},
  pages: Record<number, any[]> = {},
): { deps: ReconcileDeps; calls: Calls } {
  const calls: Calls = { recorded: [], milestones: [] };
  const deps: ReconcileDeps = {
    fetchCompletedTrades: async (page) => pages[page] ?? [],
    getRecordedTradeIds: async () => new Set<string>(),
    causeExists: async () => true,
    recordDonation: async (trade, causeId, donorId, amount) => {
      calls.recorded.push({
        tradeId: trade.id,
        causeId,
        donorId,
        amount,
      });
    },
    syncMilestones: async (causeId) => {
      calls.milestones.push(causeId);
    },
    ...overrides,
  };
  return { deps, calls };
}

function trade(overrides: Partial<BreetTradeSummary> = {}): any {
  return { ...TRADE_ROW, ...overrides };
}

describe("reconcileBreetTrades", () => {
  it("records completed trades the webhook missed and syncs milestones", async () => {
    const { deps, calls } = makeDeps(
      {},
      { 1: [trade(), trade({ id: "trade-2" })] },
    );

    const report = await reconcileBreetTrades(deps, { maxPages: 2 });

    expect(report).toMatchObject({
      scanned: 2,
      created: 2,
      alreadyRecorded: 0,
      unattributed: 0,
    });
    expect(calls.recorded.map((r) => r.tradeId)).toEqual([
      "692f91aa729255932afe9078",
      "trade-2",
    ]);
    expect(calls.milestones).toEqual(["cause456", "cause456"]);
    expect(calls.recorded[0].amount).toBe(34400);
    expect(calls.recorded[0].donorId).toBe("user123");
  });

  it("skips trades that are already recorded (by id or on-chain hash)", async () => {
    const { deps, calls } = makeDeps(
      {
        getRecordedTradeIds: async () =>
          new Set(["692f91aa729255932afe9078", "aa801188ukdjfhdbf3771"]),
      },
      {
        1: [trade(), trade({ id: "trade-2", txHash: "aa801188ukdjfhdbf3771" })],
      },
    );

    const report = await reconcileBreetTrades(deps);

    expect(report).toMatchObject({
      scanned: 2,
      alreadyRecorded: 2,
      created: 0,
    });
    expect(calls.recorded).toHaveLength(0);
  });

  it("ignores non-completed statuses like pending and flagged", async () => {
    const { deps, calls } = makeDeps(
      {},
      {
        1: [
          trade({ status: "pending" }),
          trade({ id: "flagged-1", status: "flagged" }),
        ],
      },
    );

    const report = await reconcileBreetTrades(deps);

    expect(report.scanned).toBe(0);
    expect(calls.recorded).toHaveLength(0);
  });

  it("counts unattributed trades instead of crashing", async () => {
    const { deps, calls } = makeDeps(
      { causeExists: async () => false },
      { 1: [trade()] },
    );

    const report = await reconcileBreetTrades(deps);

    expect(report).toMatchObject({ scanned: 1, unattributed: 1, created: 0 });
    expect(calls.recorded).toHaveLength(0);
    expect(report.errors).toHaveLength(0);
  });

  it("refuses to record anything when the dedupe lookup fails", async () => {
    const { deps, calls } = makeDeps(
      {
        getRecordedTradeIds: async () => {
          throw new Error("db down");
        },
      },
      { 1: [trade()] },
    );

    const report = await reconcileBreetTrades(deps);

    expect(report.created).toBe(0);
    expect(report.errors[0]).toContain("dedupe lookup failed");
    expect(calls.recorded).toHaveLength(0);
  });

  it("stops paging on a fetch error but keeps earlier pages' work", async () => {
    const { deps, calls } = makeDeps({
      fetchCompletedTrades: async (page: number) => {
        if (page === 2) throw new Error("timeout");
        return [trade()];
      },
    });

    const report = await reconcileBreetTrades(deps, { maxPages: 3 });

    expect(report).toMatchObject({ pagesFetched: 1, scanned: 1, created: 1 });
    expect(report.errors[0]).toContain("page 2: timeout");
  });

  it("stops paging after an empty page", async () => {
    const fetchPages: number[] = [];
    const { deps } = makeDeps({
      fetchCompletedTrades: async (page: number) => {
        fetchPages.push(page);
        return page === 1 ? [trade()] : [];
      },
    });

    const report = await reconcileBreetTrades(deps, { maxPages: 5 });

    // Page 2 is fetched to discover it is empty, then the loop stops.
    expect(fetchPages).toEqual([1, 2]);
    expect(report.pagesFetched).toBe(2);
    expect(report.created).toBe(1);
  });

  it("collects per-trade errors without aborting the run", async () => {
    const { deps, calls } = makeDeps(
      {
        recordDonation: async (t) => {
          if (t.id === "692f91aa729255932afe9078")
            throw new Error("fk violation");
        },
      },
      { 1: [trade(), trade({ id: "trade-2" })] },
    );

    const report = await reconcileBreetTrades(deps);

    expect(report).toMatchObject({ created: 1, scanned: 2 });
    expect(report.errors[0]).toContain(
      "trade 692f91aa729255932afe9078: fk violation",
    );
  });
});
