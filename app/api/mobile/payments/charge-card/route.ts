import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  encodeStoreReviewDemoReference,
  isStoreReviewDemoAccount,
  STORE_REVIEW_DEMO_SAVED_CARD,
} from "@/lib/auth/store-review-demo";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import { assertCauseAcceptingDonations } from "@/lib/proof-milestones";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/payments/charge-card
 * Authorizes a recurring 1-click charge on a saved card via Paystack token.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMobileRequest(request);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const user = authResult.user!;

    const body = await request.json();
    const {
      cardId,
      causeId,
      amount,
      tipAmount = 0,
      message,
      isAnonymous,
      donorName,
    } = body;

    if (!cardId || !causeId || !amount) {
      return apiError("Missing required fields: cardId, causeId, amount", 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return apiError("Minimum donation amount is ₦100", 400);
    }

    // Verify cause exists and is active
    try {
      await assertCauseAcceptingDonations(causeId);
    } catch (e: any) {
      return apiError(
        e.message || "This cause cannot accept donations currently",
        403,
      );
    }

    // Calculate exact fees
    const serviceFee = calculateServiceFee(numAmount);
    const providerFee = calculateProviderFee(numAmount, "paystack");
    const tip = Number(tipAmount) || 0;
    const totalFees = serviceFee + providerFee + tip;

    const effectiveName = isAnonymous
      ? "Anonymous"
      : donorName?.trim() || user.fullName || "Supporter";

    // Fetch cause details
    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      include: {
        user: {
          select: {
            subAccountCode: true,
          },
        },
      },
    });

    // Strictly scoped Store Reviewer Demo Mode (Decision #7 / B10):
    // Simulates 1-click saved-card charge only for playreview@refreeg.com when enabled.
    if (
      isStoreReviewDemoAccount(user.email) &&
      (cardId === STORE_REVIEW_DEMO_SAVED_CARD.id || cardId)
    ) {
      const demoReference = encodeStoreReviewDemoReference({
        causeId,
        amount: numAmount,
        tipAmount: tip,
        donorName: effectiveName,
        email: user.email,
        message: message || "",
        isAnonymous: Boolean(isAnonymous),
      });

      return apiSuccess({
        status: "success",
        reference: demoReference,
        amount: numAmount,
        serviceFee,
        providerFee,
        tipAmount: tip,
        totalCharged: numAmount + totalFees,
        isStoreReviewDemo: true,
        donation: {
          id: demoReference,
          amount: numAmount,
          donorName: effectiveName,
          causeTitle: cause?.title || "RefreeG Campaign",
          reference: demoReference,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Fetch the saved card
    const card = await prisma.user_saved_cards.findFirst({
      where: {
        id: cardId,
        user_id: user.id,
      },
    });

    if (!card) {
      return apiError("Saved card not found", 404);
    }

    const subaccount = cause?.user?.subAccountCode || undefined;

    // Generate unique reference
    const reference = `mc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Call Paystack chargeAuthorization
    const chargeResult = await Paystack.chargeAuthorization({
      authorizationCode: card.authorization_code,
      email: card.email || user.email,
      amountNgn: numAmount,
      serviceFeeNgn: totalFees,
      reference,
      causeId,
      subaccount,
      metadata: {
        cause_id: causeId,
        user_id: user.id,
        amount: numAmount,
        tip_amount: tip,
        customer_name: effectiveName,
        email: user.email,
        message: message || "",
        is_anonymous: Boolean(isAnonymous),
      },
    });

    if (chargeResult.status !== "success") {
      return apiError(
        chargeResult.gateway_response ||
          "Payment charge failed. Please try another card.",
        400,
      );
    }

    // Process the successful charge to record donation, update stats, notify donor
    try {
      await processSuccessfulCharge(reference);
    } catch (err: any) {
      console.error("Failed to process charge record:", err);
    }

    // Fetch created donation details
    const donation = await prisma.donation.findFirst({
      where: { paystack_reference: reference },
      include: {
        cause: {
          select: {
            id: true,
            title: true,
            raised: true,
            goal: true,
          },
        },
      },
    });

    return apiSuccess({
      status: "success",
      reference,
      amount: numAmount,
      serviceFee,
      providerFee,
      tipAmount: tip,
      totalCharged: numAmount + totalFees,
      donation: donation
        ? {
            id: donation.id,
            amount: Number(donation.amount),
            donorName: donation.name,
            causeTitle: donation.cause?.title,
            reference: donation.paystack_reference,
            createdAt: donation.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error charging saved card:", error);
    return apiError(error.message || "Failed to process card payment", 500);
  }
}
