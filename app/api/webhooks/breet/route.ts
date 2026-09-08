import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCryptoDonation } from "@/actions/crypto-actions";
import { syncMilestoneRequirements } from "@/lib/proof-milestones";
import { safeFetch } from "@/lib/http-client";

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

    let donorId: string | null = null;
    let causeId: string = "";

    const labelDescription = payload.destinationDescription;
    if (labelDescription && labelDescription.includes("_")) {
      const parts = labelDescription.split("_");
      donorId = parts[0] === "guest" ? null : parts[0];
      causeId = parts[1];
    }

    const finalAmountNaira = Number(payload.amountSettled || 0);
    const cryptoReceived = Number(payload.cryptoAmount || 0);

    let verifiedNetwork = "Solana Mainnet";
    if (payload.asset === "USDT_TRC20" || payload.asset === "USDT_TRX_TEST2") {
      verifiedNetwork = "TRON Mainnet";
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
      donor_wallet_address: payload.sourceAddress || "External Exchange Node",
      recipient_address: payload.destinationAddress || "Breet Liquidity Node",
      network: verifiedNetwork,
      currency: "USDT",
    });

    // 2. FIRE-AND-FORGET: Move heavy lifting to background
    Promise.resolve().then(async () => {
      try {
        await syncMilestoneRequirements(causeId);

        const creatorProfile = await prisma.user.findFirst({
          where: { causes: { some: { id: causeId } } },
        });

        const accountNumber = creatorProfile?.accountNumber;
        const bankNameText = creatorProfile?.bankName || "";

        if (accountNumber && bankNameText) {
          console.log(
            `💸 [Background] Generating Paystack Transfer Recipient...`,
          );

          const paystackBankResponse = await safeFetch(
            "https://api.paystack.co/bank?country=nigeria",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
              timeoutMs: 5000,
            },
          );

          const paystackBankData = await paystackBankResponse.json();
          let resolvedBankCode: string | null = null;

          if (paystackBankData.status && Array.isArray(paystackBankData.data)) {
            const savedBankLower = bankNameText.toLowerCase().trim();
            const matchedBankObject = paystackBankData.data.find(
              (bank: any) => {
                const currentBankNameLower = bank.name.toLowerCase();
                return (
                  currentBankNameLower.includes(savedBankLower) ||
                  savedBankLower.includes(currentBankNameLower)
                );
              },
            );

            if (matchedBankObject) {
              resolvedBankCode = matchedBankObject.code;
            }
          }

          if (!resolvedBankCode) {
            resolvedBankCode = "999992"; // OPay fallback
          }

          const recipientResponse = await safeFetch(
            "https://api.paystack.co/transferrecipient",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "nuban",
                name: creatorProfile?.fullName || "Refreeg Creator Beneficiary",
                account_number: accountNumber,
                bank_code: resolvedBankCode,
                currency: "NGN",
              }),
              timeoutMs: 5000,
            },
          );

          const recipientResult = await recipientResponse.json();

          if (recipientResult.status && recipientResult.data?.recipient_code) {
            const recipientCode = recipientResult.data.recipient_code;
            const transferAmountInKobo = Math.round(finalAmountNaira * 100);

            const paystackPayoutResponse = await safeFetch(
              "https://api.paystack.co/transfer",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  source: "balance",
                  amount: transferAmountInKobo,
                  recipient: recipientCode,
                  reason: `Refreeg Crypto Settlement for Campaign ID: ${causeId}`,
                }),
                timeoutMs: 5000,
              },
            );

            const payoutResult = await paystackPayoutResponse.json();
            if (payoutResult.status) {
              console.log(
                `🚀 [Background] SUCCESS: Cash routed to creator! Ref: ${payoutResult.data.reference}`,
              );
            } else {
              console.warn(
                `⚠️ [Background] Paystack Transfer declined:`,
                payoutResult.message,
              );
            }
          }
        }
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
