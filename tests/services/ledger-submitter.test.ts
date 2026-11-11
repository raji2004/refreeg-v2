/**
 * @jest-environment node
 */
const mockWriteContract = jest.fn();
const mockWaitForReceipt = jest.fn();
const mockGetReceipt = jest.fn();

jest.mock("viem", () => {
  const actual = jest.requireActual("viem");
  return {
    ...actual,
    createPublicClient: () => ({
      waitForTransactionReceipt: mockWaitForReceipt,
      getTransactionReceipt: mockGetReceipt,
    }),
    createWalletClient: () => ({ writeContract: mockWriteContract }),
  };
});

jest.mock("@/lib/prisma", () => ({
  prisma: {
    donationLedgerEntry: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { encodeAbiParameters, encodeEventTopics } from "viem";
import { prisma } from "@/lib/prisma";
import {
  donationLedgerAbi,
  processLedgerQueue,
  uuidToBytes32,
  type LedgerConfig,
} from "@/services/ledger-submitter";

const ledger = prisma.donationLedgerEntry as unknown as {
  findMany: jest.Mock;
  updateMany: jest.Mock;
  update: jest.Mock;
};

const config: LedgerConfig = {
  rpcUrl: "http://localhost:8545",
  chainId: 84532,
  contractAddress: "0x0000000000000000000000000000000000000001",
  privateKey:
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
};

const entry = (id: string) => ({
  id,
  causeId: "22222222-2222-2222-2222-222222222222",
  payloadHash: `0x${"ab".repeat(32)}`,
  amountKobo: BigInt(500000),
  kind: "donation",
  attempts: 0,
});

function recordedLog(id: string) {
  return {
    address: config.contractAddress,
    topics: encodeEventTopics({
      abi: donationLedgerAbi,
      eventName: "DonationRecorded",
      args: {
        entryId: uuidToBytes32(id),
        causeId: uuidToBytes32("22222222-2222-2222-2222-222222222222"),
      },
    }),
    data: encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint256" },
        { type: "uint8" },
        { type: "uint256" },
      ],
      [`0x${"ab".repeat(32)}`, BigInt(500000), 0, BigInt(1)],
    ),
    blockNumber: BigInt(10),
    blockHash: `0x${"00".repeat(32)}`,
    logIndex: 0,
    transactionHash: `0x${"cd".repeat(32)}`,
    transactionIndex: 0,
    removed: false,
  };
}

describe("ledger-submitter", () => {
  const A = "11111111-1111-1111-1111-111111111111";
  const B = "44444444-4444-4444-4444-444444444444";

  beforeEach(() => {
    jest.clearAllMocks();
    ledger.updateMany.mockResolvedValue({ count: 1 });
    ledger.findMany.mockImplementation(({ where }) =>
      Promise.resolve(where.status === "pending" ? [entry(A), entry(B)] : []),
    );
  });

  it("skips when the ledger is not configured", async () => {
    await expect(processLedgerQueue(null)).resolves.toEqual({
      skipped: "ledger not configured",
    });
    expect(ledger.findMany).not.toHaveBeenCalled();
  });

  it("submits a batch and confirms only entries emitted on-chain", async () => {
    const txHash = `0x${"cd".repeat(32)}`;
    mockWriteContract.mockResolvedValue(txHash);
    mockWaitForReceipt.mockResolvedValue({
      status: "success",
      blockNumber: BigInt(10),
      logs: [recordedLog(A)],
    });

    const result = await processLedgerQueue(config);

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "recordBatch" }),
    );
    expect(mockWriteContract.mock.calls[0][0].args[0]).toHaveLength(2);
    expect(result).toMatchObject({ submitted: 2, confirmed: 1, reconcile: 1 });
    expect(ledger.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [A] } },
        data: expect.objectContaining({ status: "confirmed" }),
      }),
    );
    expect(ledger.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [B] } },
        data: expect.objectContaining({ status: "needs_reconcile" }),
      }),
    );
  });

  it("returns entries to pending when submission fails", async () => {
    mockWriteContract.mockRejectedValue(new Error("insufficient funds"));

    const result = await processLedgerQueue(config);

    expect(result).toMatchObject({ submitted: 0, error: "submit failed" });
    expect(ledger.update).toHaveBeenCalledTimes(2);
    expect(ledger.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "pending",
          attempts: 1,
          lastError: "insufficient funds",
        }),
      }),
    );
  });

  it("does not submit entries another worker already claimed", async () => {
    ledger.updateMany.mockResolvedValue({ count: 0 });
    const result = await processLedgerQueue(config);
    expect(mockWriteContract).not.toHaveBeenCalled();
    expect(result).toMatchObject({ submitted: 0 });
  });
});
