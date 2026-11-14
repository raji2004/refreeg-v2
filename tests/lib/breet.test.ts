/**
 * tests/lib/breet.test.ts
 *
 * Unit tests for the Breet bank-name resolver (lib/breet.ts).
 * A wrong bank id routes an auto-settlement payout to the wrong bank, so
 * matching must be exact, alias-aware and fail closed.
 */

import {
  normalizeBankName,
  resolveBreetBankId,
  resolveBreetDepositAssetId,
  type BreetBank,
  type BreetDepositAsset,
} from "@/lib/breet";

const BANKS: BreetBank[] = [
  { id: "15", name: "Guaranty Trust Bank" },
  { id: "39", name: "United Bank For Africa" },
  { id: "12", name: "First Bank of Nigeria" },
  { id: "13", name: "First City Monument Bank" },
  { id: "23", name: "Kuda Bank" },
  { id: "25", name: "OPay - Paycom" },
  { id: "11", name: "Fidelity Bank" },
  { id: "43", name: "Zenith Bank" },
  { id: "1", name: "Access Bank" },
  { id: "42", name: "Wema Bank" },
];

describe("normalizeBankName", () => {
  it("lowercases and strips punctuation and spaces", () => {
    expect(normalizeBankName("  GTBank Plc-NG ")).toBe("gtbankplcng");
  });
});

describe("resolveBreetBankId", () => {
  it("matches exact bank names case-insensitively", () => {
    expect(resolveBreetBankId("Zenith Bank", BANKS)).toBe("43");
    expect(resolveBreetBankId("access bank", BANKS)).toBe("1");
  });

  it("resolves common Nigerian bank acronyms via aliases", () => {
    expect(resolveBreetBankId("GTBank", BANKS)).toBe("15");
    expect(resolveBreetBankId("GTB", BANKS)).toBe("15");
    expect(resolveBreetBankId("UBA", BANKS)).toBe("39");
    expect(resolveBreetBankId("FCMB", BANKS)).toBe("13");
    expect(resolveBreetBankId("First Bank", BANKS)).toBe("12");
  });

  it("matches when the saved name is a substring of Breet's name", () => {
    expect(resolveBreetBankId("Kuda", BANKS)).toBe("23");
    expect(resolveBreetBankId("Opay", BANKS)).toBe("25");
    expect(resolveBreetBankId("Wema", BANKS)).toBe("42");
  });

  it("ignores case, spaces and punctuation on both sides", () => {
    expect(resolveBreetBankId("  fidelity-Bank ", BANKS)).toBe("11");
  });

  it("returns null for unknown banks", () => {
    expect(resolveBreetBankId("Not A Real Bank", BANKS)).toBeNull();
  });

  it("returns null for empty or missing input and empty bank lists", () => {
    expect(resolveBreetBankId("", BANKS)).toBeNull();
    expect(resolveBreetBankId("Zenith Bank", [])).toBeNull();
  });
});

const ASSETS: BreetDepositAsset[] = [
  {
    id: "67063f653b4a1f6c7a60ec58",
    identifier: "TRX_TEST",
    symbol: "TRX",
    network: "Tron",
  },
  {
    id: "67063f653b4a1f6c7a60ec57",
    identifier: "SOL_TEST",
    symbol: "SOL",
    network: "Solana",
  },
  {
    id: "64b7f0aa1111aaaaaaaaaa01",
    identifier: "USDT_B7ZDHS8D_TOR7",
    symbol: "USDT",
    network: "Solana",
  },
  {
    id: "64b7f0aa1111aaaaaaaaaa02",
    identifier: "USDT_ERC20",
    symbol: "USDT",
    network: "Ethereum",
  },
];

describe("resolveBreetDepositAssetId", () => {
  it("picks the symbol's asset on the requested network, preferring the identifier", () => {
    expect(resolveBreetDepositAssetId(ASSETS, "USDT", "Solana")).toBe(
      "USDT_B7ZDHS8D_TOR7",
    );
    expect(resolveBreetDepositAssetId(ASSETS, "USDT", "Ethereum")).toBe(
      "USDT_ERC20",
    );
  });

  it("is case-insensitive on symbol and network", () => {
    expect(resolveBreetDepositAssetId(ASSETS, "usdt", "solana")).toBe(
      "USDT_B7ZDHS8D_TOR7",
    );
  });

  it("returns null when the network has no such symbol", () => {
    expect(resolveBreetDepositAssetId(ASSETS, "USDC", "Solana")).toBeNull();
    expect(resolveBreetDepositAssetId([], "USDT", "Solana")).toBeNull();
  });
});
