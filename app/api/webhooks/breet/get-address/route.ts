import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import {
  fetchBreetBanks,
  fetchBreetDepositAssets,
  findBreetWalletByLabel,
  generateBreetWalletAddress,
  getBreetHeaders,
  resolveBreetBankId,
  resolveBreetDepositAssetId,
  updateBreetWalletBank,
} from "@/lib/breet";

export const dynamic = "force-dynamic";

// Breet's production note: test asset identifiers don't exist in production,
// so the USDT-on-Solana deposit asset is resolved from GET /trades/assets at
// request time. BREET_ASSET_ID overrides; the fallback is only a last resort.
const FALLBACK_ASSET_ID = "USDT_SOL";
const NARRATION = "Refreeg Solana Checkout";

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

    if (donorId && donorId !== "guest") {
      const session = await auth();
      if (session?.user?.id !== donorId) {
        return NextResponse.json(
          { error: "Donor identity does not match the current session" },
          { status: 403 },
        );
      }
    }

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

    const creator = causeDetails.user;
    const bankAccountNumber = creator.accountNumber;
    const bankName = creator.bankName;

    if (!bankAccountNumber || !bankName) {
      return NextResponse.json(
        {
          error:
            "This campaign creator has not configured their bank profile settlement details yet.",
        },
        { status: 422 },
      );
    }

    const headers = getBreetHeaders();
    if (!headers) {
      console.error("❌ Breet API credentials are not configured");
      return NextResponse.json(
        { error: "Crypto checkout is not configured" },
        { status: 503 },
      );
    }

    // Breet routes the payout by ITS bank id (GET /payments/banks), so the
    // creator's saved bank name must resolve - guessing a code would send
    // the settlement to the wrong bank.
    const banks = await fetchBreetBanks().catch((err: any) => {
      console.error("💥 Could not load Breet bank list:", err?.message);
      return [];
    });
    const bankId = resolveBreetBankId(bankName, banks);
    if (!bankId) {
      console.error(
        `💥 No Breet bank match for "${bankName}" (creator ${creator.id})`,
      );
      return NextResponse.json(
        {
          error:
            "This campaign's settlement bank is not supported yet. Please ask the organizer to update their bank details.",
        },
        { status: 422 },
      );
    }

    const trackingDonorId = donorId || "guest";
    const label = `${trackingDonorId}_${causeId}`;

    // Resolve the deposit asset per Breet's production guidance (real asset
    // ids differ from sandbox ones like USDT_B7ZDHS8D_TOR7).
    let assetId = process.env.BREET_ASSET_ID || null;
    if (!assetId) {
      const assets = await fetchBreetDepositAssets().catch((err: any) => {
        console.error("💥 Could not load Breet deposit assets:", err?.message);
        return [];
      });
      assetId = resolveBreetDepositAssetId(assets, "USDT", "Solana");
      if (!assetId) {
        console.warn(
          `⚠️ No USDT/Solana deposit asset found; falling back to ${FALLBACK_ASSET_ID}`,
        );
        assetId = FALLBACK_ASSET_ID;
      }
    }

    try {
      const wallet = await generateBreetWalletAddress({
        assetId,
        label,
        bankId,
        accountNumber: bankAccountNumber,
        narration: NARRATION,
      });
      return NextResponse.json({
        success: true,
        source: "LIVE_BREET_GATEWAY",
        address: wallet.address,
      });
    } catch (genError: any) {
      // Breet answers 400 when the label's wallet already exists (repeat
      // checkouts for the same donor+cause). Re-point that wallet at the
      // creator's CURRENT bank so an updated account takes effect, then
      // return the address Breet has on file for the label.
      if (genError?.breetStatus === 400) {
        const existing = await findBreetWalletByLabel(label);
        if (existing) {
          try {
            await updateBreetWalletBank(existing.id, bankId, bankAccountNumber);
          } catch (bankErr: any) {
            console.warn(
              "⚠️ Could not refresh linked bank on existing wallet:",
              bankErr?.message,
            );
          }
          return NextResponse.json({
            success: true,
            source: "LIVE_BREET_GATEWAY",
            address: existing.address,
          });
        }
      }
      console.error("💥 Breet address generation failed:", genError?.message);
      return NextResponse.json(
        {
          error:
            "Crypto checkout could not be prepared. Please try again shortly.",
        },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("Critical Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
