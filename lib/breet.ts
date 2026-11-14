import { safeFetch } from "@/lib/http-client";

/**
 * Thin server-side client for the Breet Public API (docs.breet.io).
 *
 * Money rule: Breet auto-settlement pays the creator's bank account, so every
 * bank detail we send must be resolved against Breet's own bank list
 * (GET /payments/banks) - never a hardcoded bank id - and address generation
 * must fail loudly instead of leaving a deposit address whose trades Breet
 * cannot attribute or settle correctly.
 */

const BREET_BASE_URL = process.env.BREET_BASE_URL || "https://api.breet.io/v1";
const BANK_LIST_TTL_MS = 60 * 60 * 1000;

export function getBreetEnv(): string {
  // "production" or "sandbox" (sandbox enables Breet's mock-trade endpoint).
  // NEXT_PUBLIC_BREET_ENV is accepted as a fallback for deployments that only
  // set that name; the value is not sensitive, so reading it server-side is
  // safe. The webhook secret must NOT get this fallback treatment by default.
  return (
    process.env.BREET_ENV || process.env.NEXT_PUBLIC_BREET_ENV || "production"
  );
}

export function isBreetConfigured(): boolean {
  return Boolean(process.env.BREET_APP_ID && process.env.BREET_APP_SECRET);
}

export function getBreetHeaders(): Record<string, string> | null {
  const appId = process.env.BREET_APP_ID;
  const appSecret = process.env.BREET_APP_SECRET;
  if (!appId || !appSecret) return null;
  return {
    "x-app-id": appId,
    "x-app-secret": appSecret,
    "X-Breet-Env": getBreetEnv(),
    "Content-Type": "application/json",
  };
}

export interface BreetBank {
  id: string;
  name: string;
}

export function normalizeBankName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Acronyms Nigerian creators actually type that substring matching can't
// resolve ("GTBank" vs Breet's "Guaranty Trust Bank").
const BANK_ALIASES: Record<string, string> = {
  gtbank: "guarantytrustbank",
  gtb: "guarantytrustbank",
  uba: "unitedbankforafrica",
  fcmb: "firstcitymonumentbank",
  firstbank: "firstbankofnigeria",
};

/**
 * Map a creator's saved bank name to Breet's bank id. Pure function so it can
 * be tested against a synthetic bank list. Returns null when nothing matches
 * - callers must fail closed rather than guess a bank for a payout.
 */
export function resolveBreetBankId(
  bankName: string,
  banks: BreetBank[],
): string | null {
  const saved = normalizeBankName(bankName || "");
  if (!saved || banks.length === 0) return null;
  const target = BANK_ALIASES[saved] ?? saved;

  for (const bank of banks) {
    if (normalizeBankName(bank.name) === target) return String(bank.id);
  }
  for (const bank of banks) {
    const candidate = normalizeBankName(bank.name);
    if (candidate.includes(target) || target.includes(candidate)) {
      return String(bank.id);
    }
  }
  return null;
}

let bankCache: { banks: BreetBank[]; fetchedAt: number } | null = null;

export async function fetchBreetBanks(): Promise<BreetBank[]> {
  if (bankCache && Date.now() - bankCache.fetchedAt < BANK_LIST_TTL_MS) {
    return bankCache.banks;
  }
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const res = await safeFetch(`${BREET_BASE_URL}/payments/banks?currency=ngn`, {
    headers,
    timeoutMs: 6000,
  });
  if (!res.ok) {
    throw new Error(`Breet bank list request failed (${res.status})`);
  }
  const payload = await res.json();
  const banks: BreetBank[] = Array.isArray(payload?.data)
    ? payload.data.map((bank: any) => ({
        id: String(bank.id),
        name: String(bank.name),
      }))
    : [];
  bankCache = { banks, fetchedAt: Date.now() };
  return banks;
}

export interface BreetWallet {
  id: string;
  address: string;
  label: string;
}

/**
 * Labels are unique per wallet in Breet; generate-address answers 400 when the
 * label already exists, so the existing wallet has to be found through the
 * paginated listing.
 */
export async function findBreetWalletByLabel(
  label: string,
): Promise<BreetWallet | null> {
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const size = 100;
  for (let page = 1; page <= 20; page++) {
    const res = await safeFetch(
      `${BREET_BASE_URL}/trades/wallets?page=${page}&size=${size}`,
      { headers, timeoutMs: 6000 },
    );
    if (!res.ok) {
      throw new Error(`Breet wallet lookup failed (${res.status})`);
    }
    const payload = await res.json();
    const wallets: any[] = Array.isArray(payload?.data) ? payload.data : [];
    const match = wallets.find(
      (wallet) => wallet?.label === label && wallet?.address,
    );
    if (match) {
      return {
        id: String(match.id),
        address: String(match.address),
        label,
      };
    }
    const pages = Number(payload?.meta?.pages || 1);
    if (page >= pages || wallets.length === 0) return null;
  }
  return null;
}

/** Re-point an existing wallet at the creator's current bank account. */
export async function updateBreetWalletBank(
  walletId: string,
  bankId: string,
  accountNumber: string,
): Promise<void> {
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const res = await safeFetch(
    `${BREET_BASE_URL}/trades/wallets/${walletId}/bank`,
    {
      method: "PUT",
      headers,
      timeoutMs: 6000,
      body: JSON.stringify({
        id: bankId,
        accountNumber: String(accountNumber),
        autoSettlement: true,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Breet wallet bank update failed (${res.status})`);
  }
}

export async function generateBreetWalletAddress(params: {
  assetId: string;
  label: string;
  bankId: string;
  accountNumber: string;
  narration: string;
}): Promise<{ id: string; address: string }> {
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const res = await safeFetch(
    `${BREET_BASE_URL}/trades/sell/assets/${params.assetId}/generate-address`,
    {
      method: "POST",
      headers,
      timeoutMs: 8000,
      body: JSON.stringify({
        label: params.label,
        bankId: params.bankId,
        accountNumber: String(params.accountNumber),
        narration: params.narration.slice(0, 32),
        autoSettlement: true,
      }),
    },
  );
  const payload = await res.json().catch(() => null);
  if (res.ok && payload?.success && payload?.data?.address) {
    return {
      id: String(payload.data.id ?? ""),
      address: String(payload.data.address),
    };
  }
  const err: any = new Error(
    payload?.message || `Breet address generation failed (${res.status})`,
  );
  err.breetStatus = res.status;
  throw err;
}

export interface BreetDepositAsset {
  id: string;
  identifier: string;
  symbol: string;
  network: string;
}

let assetCache: { assets: BreetDepositAsset[]; fetchedAt: number } | null =
  null;

export async function fetchBreetDepositAssets(): Promise<BreetDepositAsset[]> {
  if (assetCache && Date.now() - assetCache.fetchedAt < BANK_LIST_TTL_MS) {
    return assetCache.assets;
  }
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const res = await safeFetch(`${BREET_BASE_URL}/trades/assets`, {
    headers,
    timeoutMs: 6000,
  });
  if (!res.ok) {
    throw new Error(`Breet assets request failed (${res.status})`);
  }
  const payload = await res.json();
  const assets: BreetDepositAsset[] = Array.isArray(payload?.data)
    ? payload.data.map((asset: any) => ({
        id: String(asset.id ?? ""),
        identifier: String(asset.identifier ?? ""),
        symbol: String(asset.symbol ?? ""),
        network: String(asset.network ?? ""),
      }))
    : [];
  assetCache = { assets, fetchedAt: Date.now() };
  return assets;
}

/** Pure so it can be tested: pick the deposit asset for a symbol + network. */
export function resolveBreetDepositAssetId(
  assets: BreetDepositAsset[],
  symbol: string,
  network: string,
): string | null {
  const wantedSymbol = symbol.toLowerCase();
  const wantedNetwork = network.toLowerCase();
  const match = assets.find(
    (asset) =>
      asset.symbol.toLowerCase() === wantedSymbol &&
      asset.network.toLowerCase() === wantedNetwork,
  );
  if (!match) return null;
  return match.identifier || match.id || null;
}

export type BreetTradeLookup = "found" | "not-found" | "unavailable";

/**
 * Breet's recommended webhook verification: confirm the trade exists on their
 * side before acting on the payload.
 */
export async function fetchBreetTransaction(
  tradeId: string,
): Promise<BreetTradeLookup> {
  const headers = getBreetHeaders();
  if (!headers || !tradeId) return "unavailable";

  try {
    const res = await safeFetch(
      `${BREET_BASE_URL}/trades/transactions/${encodeURIComponent(tradeId)}`,
      { headers, timeoutMs: 5000 },
    );
    if (res.ok) return "found";
    if (res.status === 404 || res.status === 400) return "not-found";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Cosmetic network label for donation records, shared by webhook + cron. */
export function breetAssetNetwork(asset: string): string {
  if (/TRC20|TRON/i.test(asset)) return "TRON Mainnet";
  if (/ERC20|ETH/i.test(asset)) return "Ethereum Mainnet";
  return "Solana Mainnet";
}

export interface ParsedBreetLabel {
  donorId: string | null;
  causeId: string | null;
}

/**
 * Our wallet label is `donorId_causeId`, but Breet prefixes labels with its
 * merchant reference (e.g. "Partner_B-XXXX_donorId_causeId"), so parse from
 * the END of the string, never the front. Shared by the webhook and the
 * reconciliation backfill so attribution rules have one source of truth.
 */
export function parseBreetLabel(
  label: string | undefined | null,
): ParsedBreetLabel {
  const parts = String(label || "").split("_");
  if (parts.length < 2) return { donorId: null, causeId: null };
  const donorPart = parts[parts.length - 2];
  return {
    donorId: donorPart === "guest" ? null : donorPart || null,
    causeId: parts[parts.length - 1] || null,
  };
}

/**
 * One page of Breet trades (GET /trades/transactions) for the reconciliation
 * backfill. The list response shape varies across API versions, so unwrap it
 * defensively and let callers normalize individual rows.
 */
export async function fetchBreetTradesPage(
  page: number,
  limit = 100,
): Promise<Record<string, any>[]> {
  const headers = getBreetHeaders();
  if (!headers) throw new Error("Breet API credentials are not configured");

  const res = await safeFetch(
    `${BREET_BASE_URL}/trades/transactions?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
    { headers, timeoutMs: 10000 },
  );
  if (!res.ok) {
    throw new Error(`Breet trades list request failed (${res.status})`);
  }
  const payload = await res.json();
  const rows =
    payload?.data?.data ?? payload?.data ?? payload?.transactions ?? [];
  return Array.isArray(rows) ? rows : [];
}

export type BreetBankValidation =
  | { status: "valid"; accountName: string; bankName: string }
  | { status: "invalid"; message: string }
  | { status: "unavailable" };

/**
 * Verify an account number against a Breet bank id (POST /payments/banks/validate).
 * "unavailable" covers outages, timeouts and auth problems - callers must not
 * block users on it; "invalid" is a definitive no from Breet.
 */
export async function validateBreetBankAccount(
  bankId: string,
  accountNumber: string,
): Promise<BreetBankValidation> {
  const headers = getBreetHeaders();
  if (!headers) return { status: "unavailable" };

  try {
    const res = await safeFetch(`${BREET_BASE_URL}/payments/banks/validate`, {
      method: "POST",
      headers,
      timeoutMs: 6000,
      body: JSON.stringify({
        id: bankId,
        accountNumber: String(accountNumber),
        currency: "ngn",
      }),
    });
    const payload = await res.json().catch(() => null);
    if (res.ok && payload?.success && payload?.data?.accountName) {
      return {
        status: "valid",
        accountName: String(payload.data.accountName),
        bankName: String(payload.data.bankName || ""),
      };
    }
    if (
      payload &&
      payload.success === false &&
      res.status < 500 &&
      res.status !== 401 &&
      res.status !== 403
    ) {
      return {
        status: "invalid",
        message: String(
          payload.message || "Bank account could not be verified",
        ),
      };
    }
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
