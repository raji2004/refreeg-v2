import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  pad,
  parseEventLogs,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { prisma } from "@/lib/prisma";

export const donationLedgerAbi = [
  {
    type: "function",
    name: "recordBatch",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "entries",
        type: "tuple[]",
        components: [
          { name: "entryId", type: "bytes32" },
          { name: "causeId", type: "bytes32" },
          { name: "payloadHash", type: "bytes32" },
          { name: "amountKobo", type: "uint256" },
          { name: "kind", type: "uint8" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "DonationRecorded",
    inputs: [
      { name: "entryId", type: "bytes32", indexed: true },
      { name: "causeId", type: "bytes32", indexed: true },
      { name: "payloadHash", type: "bytes32", indexed: false },
      { name: "amountKobo", type: "uint256", indexed: false },
      { name: "kind", type: "uint8", indexed: false },
      { name: "recordedAt", type: "uint256", indexed: false },
    ],
  },
] as const;

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const STALE_SUBMITTING_MS = 15 * 60 * 1000;
const RECEIPT_TIMEOUT_MS = 30 * 1000;

export type LedgerConfig = {
  rpcUrl: string;
  chainId: number;
  contractAddress: `0x${string}`;
  privateKey: `0x${string}`;
};

export function readLedgerConfig(env = process.env): LedgerConfig | null {
  const {
    LEDGER_RPC_URL,
    LEDGER_CHAIN_ID,
    LEDGER_CONTRACT_ADDRESS,
    LEDGER_RECORDER_PRIVATE_KEY,
  } = env;
  if (
    !LEDGER_RPC_URL ||
    !LEDGER_CHAIN_ID ||
    !LEDGER_CONTRACT_ADDRESS ||
    !LEDGER_RECORDER_PRIVATE_KEY
  ) {
    return null;
  }
  return {
    rpcUrl: LEDGER_RPC_URL,
    chainId: Number(LEDGER_CHAIN_ID),
    contractAddress: LEDGER_CONTRACT_ADDRESS as `0x${string}`,
    privateKey: LEDGER_RECORDER_PRIVATE_KEY as `0x${string}`,
  };
}

export function uuidToBytes32(uuid: string): `0x${string}` {
  return pad(`0x${uuid.replace(/-/g, "").toLowerCase()}`, { size: 32 });
}

function clients(config: LedgerConfig) {
  const chain = defineChain({
    id: config.chainId,
    name: `ledger-${config.chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
  const transport = http(config.rpcUrl);
  return {
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({
      chain,
      transport,
      account: privateKeyToAccount(config.privateKey),
    }),
  };
}

type EntryRow = { id: string; attempts: number };

async function applyReceipt(
  txHash: Hash,
  receipt: TransactionReceipt,
  entries: EntryRow[],
) {
  if (receipt.status !== "success") {
    await markRetry(entries, `transaction ${txHash} reverted`);
    return { confirmed: 0, reconcile: 0, retried: entries.length };
  }

  const emitted = new Set(
    parseEventLogs({
      abi: donationLedgerAbi,
      logs: receipt.logs,
      eventName: "DonationRecorded",
    }).map((log) => log.args.entryId.toLowerCase()),
  );
  const confirmedIds = entries
    .filter((e) => emitted.has(uuidToBytes32(e.id)))
    .map((e) => e.id);
  const reconcileIds = entries
    .filter((e) => !emitted.has(uuidToBytes32(e.id)))
    .map((e) => e.id);

  if (confirmedIds.length) {
    await prisma.donationLedgerEntry.updateMany({
      where: { id: { in: confirmedIds } },
      data: {
        status: "confirmed",
        blockNumber: receipt.blockNumber,
        confirmedAt: new Date(),
        lastError: null,
      },
    });
  }
  // Already on-chain from an earlier tx whose hash we lost; needs a manual event lookup.
  if (reconcileIds.length) {
    await prisma.donationLedgerEntry.updateMany({
      where: { id: { in: reconcileIds } },
      data: {
        status: "needs_reconcile",
        lastError: `not emitted in ${txHash}; already recorded by an earlier transaction`,
      },
    });
  }
  return {
    confirmed: confirmedIds.length,
    reconcile: reconcileIds.length,
    retried: 0,
  };
}

async function markRetry(entries: EntryRow[], error: string) {
  for (const e of entries) {
    const attempts = e.attempts + 1;
    await prisma.donationLedgerEntry.update({
      where: { id: e.id },
      data: {
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        txHash: null,
        submittedAt: null,
        lastError: error.slice(0, 1000),
      },
    });
  }
}

async function resetStaleSubmitting() {
  const { count } = await prisma.donationLedgerEntry.updateMany({
    where: {
      status: "submitting",
      submittedAt: { lt: new Date(Date.now() - STALE_SUBMITTING_MS) },
    },
    data: { status: "pending", submittedAt: null },
  });
  return count;
}

async function reconcileSubmitted(
  publicClient: ReturnType<typeof clients>["publicClient"],
) {
  const submitted = await prisma.donationLedgerEntry.findMany({
    where: { status: "submitted", txHash: { not: null } },
    select: { id: true, attempts: true, txHash: true, submittedAt: true },
    take: 500,
  });
  const byTx = new Map<string, typeof submitted>();
  for (const e of submitted) {
    byTx.set(e.txHash!, [...(byTx.get(e.txHash!) ?? []), e]);
  }

  let confirmed = 0;
  for (const [txHash, entries] of byTx) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as Hash,
      });
      confirmed += (await applyReceipt(txHash as Hash, receipt, entries))
        .confirmed;
    } catch {
      const oldest = Math.min(
        ...entries.map((e) => e.submittedAt?.getTime() ?? Date.now()),
      );
      if (Date.now() - oldest > STALE_SUBMITTING_MS) {
        await markRetry(
          entries,
          `transaction ${txHash} not mined after 15 minutes`,
        );
      }
    }
  }
  return confirmed;
}

export async function processLedgerQueue(
  config: LedgerConfig | null = readLedgerConfig(),
) {
  if (!config) return { skipped: "ledger not configured" as const };

  const { publicClient, walletClient } = clients(config);
  const staleReset = await resetStaleSubmitting();
  const reconciled = await reconcileSubmitted(publicClient);

  const candidates = await prisma.donationLedgerEntry.findMany({
    where: { status: "pending", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const claimedAt = new Date();
  const claimed: typeof candidates = [];
  for (const entry of candidates) {
    const { count } = await prisma.donationLedgerEntry.updateMany({
      where: { id: entry.id, status: "pending" },
      data: {
        status: "submitting",
        submittedAt: claimedAt,
        chainId: config.chainId,
      },
    });
    if (count === 1) claimed.push(entry);
  }
  if (!claimed.length) return { staleReset, reconciled, submitted: 0 };

  let txHash: Hash;
  try {
    txHash = await walletClient.writeContract({
      address: config.contractAddress,
      abi: donationLedgerAbi,
      functionName: "recordBatch",
      args: [
        claimed.map((e) => ({
          entryId: uuidToBytes32(e.id),
          causeId: uuidToBytes32(e.causeId),
          payloadHash: e.payloadHash as `0x${string}`,
          amountKobo: e.amountKobo,
          kind: e.kind === "reversal" ? 1 : 0,
        })),
      ],
    });
  } catch (error) {
    await markRetry(
      claimed,
      error instanceof Error ? error.message : String(error),
    );
    return { staleReset, reconciled, submitted: 0, error: "submit failed" };
  }

  await prisma.donationLedgerEntry.updateMany({
    where: { id: { in: claimed.map((e) => e.id) } },
    data: { status: "submitted", txHash },
  });

  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    const result = await applyReceipt(txHash, receipt, claimed);
    return {
      staleReset,
      reconciled,
      submitted: claimed.length,
      txHash,
      ...result,
    };
  } catch {
    return {
      staleReset,
      reconciled,
      submitted: claimed.length,
      txHash,
      pendingReceipt: true,
    };
  }
}
