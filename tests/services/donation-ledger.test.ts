/**
 * @jest-environment node
 */
import {
  buildCryptoLedgerEntry,
  buildFiatLedgerEntry,
  hashLedgerPayload,
  toKobo,
  verifyLedgerPayload,
} from "@/services/donation-ledger";

describe("donation-ledger", () => {
  const createdAt = new Date("2026-11-06T10:00:00.000Z");

  it("converts naira amounts to integer kobo without float drift", () => {
    expect(toKobo(5000)).toBe(BigInt(500000));
    expect(toKobo("1234.5")).toBe(BigInt(123450));
    expect(toKobo("0.07")).toBe(BigInt(7));
    expect(toKobo("19.999")).toBe(BigInt(1999));
    expect(toKobo({ toString: () => "250.10" })).toBe(BigInt(25010));
  });

  it("builds a fiat entry whose hash verifies and excludes donor PII", () => {
    const entry = buildFiatLedgerEntry({
      id: "11111111-1111-1111-1111-111111111111",
      causeId: "22222222-2222-2222-2222-222222222222",
      amount: "5000",
      payment_provider: "flutterwave",
      createdAt,
    });

    expect(entry.sourceType).toBe("donation");
    expect(entry.amountKobo).toBe(BigInt(500000));
    expect(verifyLedgerPayload(entry.payload, entry.payloadHash)).toBe(true);

    const payload = JSON.parse(entry.payload);
    expect(payload).toMatchObject({
      v: 1,
      kind: "donation",
      provider: "flutterwave",
      amountKobo: "500000",
      createdAt: createdAt.toISOString(),
      asset: null,
    });
    expect(payload.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(entry.payload).not.toMatch(/email|name|message/i);
  });

  it("salts every entry so identical donations hash differently", () => {
    const input = {
      id: "11111111-1111-1111-1111-111111111111",
      causeId: "22222222-2222-2222-2222-222222222222",
      amount: 100,
      createdAt,
    };
    expect(buildFiatLedgerEntry(input).payloadHash).not.toBe(
      buildFiatLedgerEntry(input).payloadHash,
    );
  });

  it("detects a tampered payload", () => {
    const entry = buildFiatLedgerEntry({
      id: "11111111-1111-1111-1111-111111111111",
      causeId: "22222222-2222-2222-2222-222222222222",
      amount: 100,
      createdAt,
    });
    const tampered = entry.payload.replace('"10000"', '"99900"');
    expect(verifyLedgerPayload(tampered, entry.payloadHash)).toBe(false);
    expect(hashLedgerPayload(entry.payload)).toBe(entry.payloadHash);
  });

  it("records the on-chain source transaction for crypto donations", () => {
    const entry = buildCryptoLedgerEntry(
      {
        id: "33333333-3333-3333-3333-333333333333",
        cause_id: "22222222-2222-2222-2222-222222222222",
        amount_in_naira: 75000,
        amount_in_crypto: 50,
        currency: "USDT",
        network: "TRON Mainnet",
        tx_signature: "abc123",
        created_at: createdAt,
      },
      "breet",
    );
    expect(entry.sourceType).toBe("crypto_donation");
    expect(JSON.parse(entry.payload).asset).toEqual({
      amount: "50",
      currency: "USDT",
      network: "TRON Mainnet",
      txHash: "abc123",
    });
  });
});
