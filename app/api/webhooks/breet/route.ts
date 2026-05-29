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
    const incomingSecret = req.headers.get("x-webhook-secret");
    if (incomingSecret !== process.env.NEXT_PUBLIC_BREET_WEBHOOK_SECRET) {
      console.warn("❌ Webhook secret signature key mismatch.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = await req.json();

    if (payload.event !== "trade.completed" || payload.status !== "completed") {
      return NextResponse.json({
        success: true,
        message: "Ignoring non-terminal event state",
      });
    }

    const existingTx = await prisma.crypto_donations.findFirst({
      where: { tx_signature: payload.txHash },
    });

    if (existingTx) {
      console.log(
        `🛑 Hash ${payload.txHash} already processed. Exiting cleanly.`,
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

    console.log(`⚡ Forwarding payload to createCryptoDonation action...`);

    const result = await createCryptoDonation({
      cause_id: causeId,
      user_id: donorId,
      amount_in_naira: finalAmountNaira,
      amount_in_crypto: cryptoReceived,
      status: "completed",
      tx_hash: payload.txHash,
      tx_signature: payload.txHash,
      donor_wallet_address: payload.sourceAddress || "External Exchange Node",
      recipient_address: payload.destinationAddress || "Breet Liquidity Node",
      network: "Solana Mainnet",
      currency: "USDT",
    });

    console.log(`🎉 SUCCESS: Webhook execution completed. ID: ${result.id}`);

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
