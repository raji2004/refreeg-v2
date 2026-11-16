import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { createCryptoDonation } from "@/actions/crypto-actions";
import { syncMilestoneRequirements } from "@/lib/proof-milestones";
import {
  breetAssetNetwork,
  fetchBreetTransaction,
  parseBreetLabel,
} from "@/lib/breet";
import { getClientIp } from "@/lib/client-ip";

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
          cause_id: causeId,
          created_at: { gte: dynamicWindow },
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json(
        { hasNewDonation: !!recentRecord },
        {
          headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
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
    const clientIp = getClientIp(req.headers);

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

    const incomingSecret = req.headers.get("x-webhook-secret") || "";
    const expectedSecret =
      process.env.BREET_WEBHOOK_SECRET ||
      process.env.NEXT_PUBLIC_BREET_WEBHOOK_SECRET ||
      "";

    if (expectedSecret && !process.env.BREET_WEBHOOK_SECRET) {
      console.error(
        "🚨 BREET_WEBHOOK_SECRET is unset; falling back to NEXT_PUBLIC_BREET_WEBHOOK_SECRET. " +
          "NEXT_PUBLIC_ variables are inlined into the client JavaScript bundle and readable " +
          "by every visitor - rename this secret (BREET_WEBHOOK_SECRET) so it stays server-only.",
      );
    }

    if (expectedSecret) {
      const providedBuf = Buffer.from(incomingSecret, "utf8");
      const expectedBuf = Buffer.from(expectedSecret, "utf8");
      if (
        !incomingSecret ||
        providedBuf.length !== expectedBuf.length ||
        !timingSafeEqual(providedBuf, expectedBuf)
      ) {
        console.warn("❌ Webhook verification secret mismatch.");
        return NextResponse.json(
          { error: "Invalid signature key" },
          { status: 401 },
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ BREET_WEBHOOK_SECRET is not configured; rejecting webhook",
      );
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    } else {
      console.warn(
        "⚠️ BREET_WEBHOOK_SECRET not set; accepting webhook outside production",
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

    // Our label is `donorId_causeId`, but Breet prefixes labels with its
    // merchant reference (e.g. "Partner_B-XXXX_donorId_causeId"), so parse
    // from the END of the string, not the front (parseBreetLabel is shared
    // with the reconciliation backfill).
    const labelDescription: string = payload.destinationDescription || "";
    const { donorId, causeId } = parseBreetLabel(labelDescription);

    // Record the GROSS donation (amountInUSD × rate) so campaign totals show
    // what donors actually gave; the 5% markup and Breet's fees are payout
    // economics (amountSettled) and must not shrink the public figure.
    const finalAmountNaira = Math.round(
      Number(payload.amountInUSD || 0) * Number(payload.rate || 0),
    );
    const cryptoReceived = Number(payload.cryptoAmount || 0);
    const verifiedNetwork = breetAssetNetwork(payload.asset);

    // A trade we cannot attribute to a live cause is settled by Breet either
    // way; recording it would only crash, trigger retries and eventually get
    // the webhook auto-disabled. Acknowledge and log instead.
    if (causeId) {
      const causeExists = await prisma.cause.findUnique({
        where: { id: causeId },
        select: { id: true },
      });
      if (!causeExists) {
        console.error(
          `💥 Label "${labelDescription}" resolved to unknown cause ${causeId}; skipping record`,
        );
        return NextResponse.json({
          success: true,
          message: "Unattributable trade acknowledged",
        });
      }
    } else {
      console.error(
        `💥 Trade ${uniqueBreetEventId} has no parsable label ("${labelDescription}"); skipping record`,
      );
      return NextResponse.json({
        success: true,
        message: "Unattributable trade acknowledged",
      });
    }

    // Breet's recommended extra verification: confirm the trade exists on
    // their side before acting. A definitive miss is ignored; API downtime
    // fails open because IP + secret checks already passed.
    const breetTrade = await fetchBreetTransaction(String(payload.id || ""));
    if (breetTrade === "not-found") {
      console.error(
        `💥 Breet has no trade ${payload.id}; ignoring unverifiable webhook`,
      );
      return NextResponse.json({
        success: true,
        message: "Unverifiable trade acknowledged",
      });
    }
    if (breetTrade === "unavailable") {
      console.warn(
        `⚠️ Could not verify trade ${payload.id} with Breet API; proceeding on verified IP+secret`,
      );
    }

    // 1. CRITICAL: Create DB record (Must succeed)
    const result = await createCryptoDonation({
      cause_id: causeId,
      user_id: donorId,
      amount_in_naira: finalAmountNaira,
      amount_in_crypto: cryptoReceived,
      status: "completed",
      tx_hash: uniqueBreetEventId || payload.txHash,
      tx_signature: payload.txHash,
      // Breet's field is senderAddress; sourceAddress kept as a legacy alias.
      donor_wallet_address:
        payload.senderAddress ||
        payload.sourceAddress ||
        "External Exchange Node",
      recipient_address: payload.destinationAddress || "Breet Liquidity Node",
      network: verifiedNetwork,
      currency: "USDT",
    });

    // 2. FIRE-AND-FORGET: Move heavy lifting to background
    Promise.resolve().then(async () => {
      try {
        await syncMilestoneRequirements(causeId);
        // The creator is paid exactly once, by Breet auto-settlement at
        // address-generation time. The webhook deliberately never moves money.
      } catch (bgError) {
        console.error("[Webhook Background] Failed:", bgError);
      }
    });

    // 3. Return 200 OK immediately to Breet
    return NextResponse.json({
      success: true,
      message: "Database tracking synchronized.",
      donation_id: result.id,
    });
  } catch (error: any) {
    console.error("💥 WEBHOOK PIPELINE CRASH:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
