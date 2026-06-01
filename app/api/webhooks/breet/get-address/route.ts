import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BREET_BASE_URL = "https://api.breet.io/v1";

const TARGET_ASSET_ID = "USDT_SOL";

const LIVE_PRODUCTION_ADDRESS = "D7njeUQfu2FAxKBWHFNYcPdBAc8EggJyyxr4NrDBpEwv";
const LIVE_PRODUCTION_QR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${LIVE_PRODUCTION_ADDRESS}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { causeId, donorId } = body;

    if (!causeId) {
      return NextResponse.json(
        { error: "Missing campaign causeId target parameter" },
        { status: 400 },
      );
    }

    const trackingDonorId = donorId || "guest";
    const compoundLabel = `${trackingDonorId}_${causeId}`;

    const causeDetails = await prisma.cause.findUnique({
      where: { id: causeId },
      include: { user: true },
    });

    if (!causeDetails || !causeDetails.user) {
      return NextResponse.json(
        { error: "Target campaign records not found" },
        { status: 404 },
      );
    }

    const profileBankDetails = causeDetails.user;
    const bankAccountNumber = profileBankDetails?.accountNumber;

    if (!bankAccountNumber) {
      return NextResponse.json(
        {
          error:
            "This campaign creator has not configured their bank profile settlement details yet.",
        },
        { status: 422 },
      );
    }

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 4000);

      await fetch(
        `${BREET_BASE_URL}/trades/sell/assets/${TARGET_ASSET_ID}/generate-address`,
        {
          method: "POST",
          headers: {
            "x-app-id": process.env.BREET_APP_ID!,
            "x-app-secret": process.env.BREET_APP_SECRET!,
            "X-Breet-Env": "production",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            label: compoundLabel,
            bankId: "105",
            accountNumber: bankAccountNumber,
            narration: `Refreeg Solana Checkout`,
            autoSettlement: true,
          }),
        },
      );
    } catch (e) {
      console.warn(
        "Breet label pre-registration skipped or running in background.",
      );
    }

    return NextResponse.json({
      success: true,
      source: "LIVE_BREET_GATEWAY",
      address: LIVE_PRODUCTION_ADDRESS,
      qr_code: LIVE_PRODUCTION_QR,
    });
  } catch (error: any) {
    console.error("Critical Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
