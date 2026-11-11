import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLedgerPayload } from "@/services/donation-ledger";
import { uuidToBytes32 } from "@/services/ledger-submitter";

const SOURCE_TYPES = new Set(["donation", "crypto_donation"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceType: string; id: string }> },
) {
  const { sourceType, id } = await params;
  if (!SOURCE_TYPES.has(sourceType) || !UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entries = await prisma.donationLedgerEntry.findMany({
    where: { sourceType, sourceId: id },
    orderBy: { createdAt: "asc" },
  });
  if (!entries.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const explorer = process.env.LEDGER_EXPLORER_URL?.replace(/\/$/, "");
  return NextResponse.json({
    contract: process.env.LEDGER_CONTRACT_ADDRESS ?? null,
    entries: entries.map((e) => ({
      entryId: uuidToBytes32(e.id),
      kind: e.kind,
      status: e.status,
      payload: e.payload,
      payloadHash: e.payloadHash,
      hashMatchesPayload: verifyLedgerPayload(e.payload, e.payloadHash),
      chainId: e.chainId,
      txHash: e.status === "confirmed" ? e.txHash : null,
      blockNumber: e.blockNumber?.toString() ?? null,
      explorerUrl:
        explorer && e.status === "confirmed" && e.txHash
          ? `${explorer}/tx/${e.txHash}`
          : null,
    })),
  });
}
