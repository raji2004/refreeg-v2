import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { keccak256, toBytes } from "viem";

export const LEDGER_PAYLOAD_VERSION = 1;

export type LedgerSourceType = "donation" | "crypto_donation";
export type LedgerKind = "donation" | "reversal";

type DecimalLike = number | string | { toString(): string };

export type LedgerPayload = {
  v: number;
  kind: LedgerKind;
  source: LedgerSourceType;
  id: string;
  causeId: string;
  amountKobo: string;
  currency: "NGN";
  provider: string;
  createdAt: string;
  asset: {
    amount: string;
    currency: string;
    network: string;
    txHash: string | null;
  } | null;
  salt: string;
};

export function toKobo(amount: DecimalLike): bigint {
  const [whole, frac = ""] = amount.toString().trim().split(".");
  const negative = whole.startsWith("-");
  const digits = `${whole.replace("-", "") || "0"}${(frac + "00").slice(0, 2)}`;
  const kobo = BigInt(digits);
  return negative ? -kobo : kobo;
}

// Field order is fixed so the same donation always serialises to the same bytes.
export function serializeLedgerPayload(p: LedgerPayload): string {
  return JSON.stringify({
    v: p.v,
    kind: p.kind,
    source: p.source,
    id: p.id,
    causeId: p.causeId,
    amountKobo: p.amountKobo,
    currency: p.currency,
    provider: p.provider,
    createdAt: p.createdAt,
    asset: p.asset
      ? {
          amount: p.asset.amount,
          currency: p.asset.currency,
          network: p.asset.network,
          txHash: p.asset.txHash,
        }
      : null,
    salt: p.salt,
  });
}

export function hashLedgerPayload(serialized: string): `0x${string}` {
  return keccak256(toBytes(serialized));
}

export function verifyLedgerPayload(
  serialized: string,
  expectedHash: string,
): boolean {
  return (
    hashLedgerPayload(serialized).toLowerCase() === expectedHash.toLowerCase()
  );
}

export type FiatDonationInput = {
  id: string;
  causeId: string;
  amount: DecimalLike;
  payment_provider?: string | null;
  createdAt?: Date | null;
};

export type CryptoDonationInput = {
  id: string;
  cause_id: string;
  amount_in_naira: DecimalLike;
  amount_in_crypto: DecimalLike;
  currency: string;
  network: string;
  tx_signature?: string | null;
  created_at?: Date | null;
};

function buildEntry(
  source: LedgerSourceType,
  kind: LedgerKind,
  payload: Omit<LedgerPayload, "v" | "kind" | "source" | "salt">,
): Prisma.DonationLedgerEntryCreateInput {
  const full: LedgerPayload = {
    v: LEDGER_PAYLOAD_VERSION,
    kind,
    source,
    salt: randomBytes(16).toString("hex"),
    ...payload,
  };
  const serialized = serializeLedgerPayload(full);
  return {
    sourceType: source,
    sourceId: full.id,
    causeId: full.causeId,
    kind,
    amountKobo: BigInt(full.amountKobo),
    payload: serialized,
    payloadHash: hashLedgerPayload(serialized),
  };
}

export function buildFiatLedgerEntry(
  d: FiatDonationInput,
  kind: LedgerKind = "donation",
): Prisma.DonationLedgerEntryCreateInput {
  return buildEntry("donation", kind, {
    id: d.id,
    causeId: d.causeId,
    amountKobo: toKobo(d.amount).toString(),
    currency: "NGN",
    provider: d.payment_provider || "paystack",
    createdAt: (d.createdAt ?? new Date()).toISOString(),
    asset: null,
  });
}

export function buildCryptoLedgerEntry(
  d: CryptoDonationInput,
  provider: string,
  kind: LedgerKind = "donation",
): Prisma.DonationLedgerEntryCreateInput {
  return buildEntry("crypto_donation", kind, {
    id: d.id,
    causeId: d.cause_id,
    amountKobo: toKobo(d.amount_in_naira).toString(),
    currency: "NGN",
    provider,
    createdAt: (d.created_at ?? new Date()).toISOString(),
    asset: {
      amount: d.amount_in_crypto.toString(),
      currency: d.currency,
      network: d.network,
      txHash: d.tx_signature || null,
    },
  });
}

type LedgerTx = Pick<Prisma.TransactionClient, "donationLedgerEntry">;

export async function enqueueFiatDonation(tx: LedgerTx, d: FiatDonationInput) {
  return tx.donationLedgerEntry.create({ data: buildFiatLedgerEntry(d) });
}

export async function enqueueCryptoDonation(
  tx: LedgerTx,
  d: CryptoDonationInput,
  provider: string,
) {
  return tx.donationLedgerEntry.create({
    data: buildCryptoLedgerEntry(d, provider),
  });
}
