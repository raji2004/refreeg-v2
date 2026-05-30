import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCryptoDonation } from "@/actions/crypto-actions";

export const dynamic = "force-dynamic";

const BREET_IPS = [
  "46.101.201.155",
  "46.101.225.109",
  "46.101.225.97",
  "46.101.225.251",
  "159.89.20.62",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checkStatus = searchParams.get("checkStatus");
    const causeId = searchParams.get("causeId");

    if (checkStatus && causeId) {
      const dynamicWindow = new Date(Date.now() - 3 * 60 * 1000);
      const recentRecord = await prisma.crypto_donations.findFirst({
        where: {
          OR: [{ cause_id: causeId }, { status: "completed" }],
          created_at: { gte: dynamicWindow },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return NextResponse.json(
        { hasNewDonation: !!recentRecord },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        },
      );
    }
    return NextResponse.json({ error: "Missing criteria" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.headers.get("x-real-ip");

    if (
      process.env.NODE_ENV === "production" &&
      (!clientIp || !BREET_IPS.includes(clientIp))
    ) {
      console.warn(
        `🛑 Blocked unauthorized webhook origin attempt from IP: ${clientIp}`,
      );
      return NextResponse.json(
        { error: "Forbidden origin network" },
        { status: 403 },
      );
    }

    const incomingSecret = req.headers.get("x-webhook-secret");
    if (incomingSecret !== process.env.NEXT_PUBLIC_BREET_WEBHOOK_SECRET) {
      console.warn("❌ Webhook verification secret mismatch.");
      return NextResponse.json(
        { error: "Invalid signature key" },
        { status: 401 },
      );
    }

    const payload = await req.json();

    if (!payload || !payload.event) {
      return NextResponse.json(
        { error: "Malformed payload container" },
        { status: 400 },
      );
    }

    if (payload.event !== "trade.completed" || payload.status !== "completed") {
      return NextResponse.json({
        success: true,
        message: "Acknowledged and ignoring non-terminal event sequence state",
      });
    }

    const uniqueBreetEventId = payload.id ? String(payload.id) : null;

    const existingTx = await prisma.crypto_donations.findFirst({
      where: {
        OR: [
          { tx_signature: payload.txHash },
          ...(uniqueBreetEventId ? [{ tx_hash: uniqueBreetEventId }] : []),
        ],
      },
    });

    if (existingTx) {
      console.log(
        `🛑 Event ${payload.txHash || uniqueBreetEventId} already accounted for. Exiting cleanly.`,
      );
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    let donorId: string | null = "c029d35f-861b-4046-bba2-011166111221";
    let causeId: string = "e6fef262-0beb-417c-bb0d-0fbdc8601b13";

    const labelDescription = payload.destinationDescription;
    if (labelDescription && labelDescription.includes("_")) {
      const parts = labelDescription.split("_");
      donorId = parts[0] === "guest" ? null : parts[0];
      causeId = parts[1];
    }

    const finalAmountNaira = Number(payload.amountSettled || 0);
    const cryptoReceived = Number(payload.cryptoAmount || 0);

    let verifiedNetwork = "Solana Mainnet";
    const payloadAsset = payload.asset || "";

    if (payloadAsset === "USDT_TRC20" || payloadAsset === "USDT_TRX_TEST2") {
      verifiedNetwork = "TRON Mainnet";
    }

    console.log(
      `⚡ Forwarding validated ${verifiedNetwork} execution to core data actions...`,
    );

    const result = await createCryptoDonation({
      cause_id: causeId,
      user_id: donorId,
      amount_in_naira: finalAmountNaira,
      amount_in_crypto: cryptoReceived,
      status: "completed",
      tx_hash: uniqueBreetEventId || payload.txHash,
      tx_signature: payload.txHash,
      donor_wallet_address: payload.sourceAddress || "External Exchange Node",
      recipient_address: payload.destinationAddress || "Breet Liquidity Node",
      network: verifiedNetwork,
      currency: "USDT",
    });

    console.log(
      `🎉 SUCCESS: Webhook execution completed. Reference ID: ${result.id}`,
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Database tracking synchronized perfectly via core actions layer",
        donation_id: result.id,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("💥 WEBHOOK PIPELINE CRASH:", error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
