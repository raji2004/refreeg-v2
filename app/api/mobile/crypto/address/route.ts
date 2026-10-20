import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

const BREET_BASE_URL = "https://api.breet.io/v1";
const TARGET_ASSET_ID = "USDT_SOL";
const LIVE_PRODUCTION_ADDRESS = "D7njeUQfu2FAxKBWHFNYcPdBAc8EggJyyxr4NrDBpEwv";
const LIVE_PRODUCTION_QR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${LIVE_PRODUCTION_ADDRESS}`;

/**
 * POST /api/mobile/crypto/address
 * Returns deposit address and QR code for USDT on Solana donations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { causeId, donorId } = body;

    if (!causeId) {
      return apiError("Missing causeId parameter", 400);
    }

    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      include: { user: true },
    });

    if (!cause) {
      return apiError("Target campaign records not found", 404);
    }

    const bankAccountNumber = cause.user?.accountNumber;
    const trackingDonorId = donorId || "mobile_guest";
    const compoundLabel = `${trackingDonorId}_${causeId}`;

    if (
      process.env.BREET_APP_ID &&
      process.env.BREET_APP_SECRET &&
      bankAccountNumber
    ) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        await fetch(
          `${BREET_BASE_URL}/trades/sell/assets/${TARGET_ASSET_ID}/generate-address`,
          {
            method: "POST",
            headers: {
              "x-app-id": process.env.BREET_APP_ID,
              "x-app-secret": process.env.BREET_APP_SECRET,
              "X-Breet-Env": "production",
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              label: compoundLabel,
              bankId: "105",
              accountNumber: bankAccountNumber,
              narration: "Refreeg Solana Checkout",
              autoSettlement: true,
            }),
          },
        );
        clearTimeout(timeout);
      } catch (e) {
        console.warn("Breet label pre-registration skipped or timed out.");
      }
    }

    return apiSuccess({
      asset: "USDT",
      network: "Solana (SPL)",
      address: LIVE_PRODUCTION_ADDRESS,
      qrCodeUrl: LIVE_PRODUCTION_QR,
      campaignTitle: cause.title,
    });
  } catch (error: any) {
    console.error("Mobile Crypto Address Error:", error);
    return apiError(error.message || "Failed to generate crypto address", 500);
  }
}
