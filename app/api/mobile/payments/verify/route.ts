import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { decodeStoreReviewDemoReference } from "@/lib/auth/store-review-demo";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

async function handleVerification(reference: string | null) {
  if (!reference) {
    return apiError("Missing payment reference", 400);
  }

  // Strictly scoped Store Reviewer Demo Mode verification (Decision #7 / B10):
  // Only succeeds when STORE_REVIEW_DEMO_ENABLED="true" and reference was issued by
  // the store-review-demo encoder. Never mutates real campaign raised balances.
  const demoPayload = decodeStoreReviewDemoReference(reference);
  if (demoPayload) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cause = uuidRegex.test(demoPayload.causeId)
      ? await prisma.cause.findUnique({
          where: { id: demoPayload.causeId },
          select: {
            id: true,
            title: true,
            raised: true,
            goal: true,
            category: true,
          },
        })
      : null;

    return apiSuccess({
      verified: true,
      reference,
      isStoreReviewDemo: true,
      donation: {
        id: reference,
        amount: demoPayload.amount,
        tipAmount: demoPayload.tipAmount,
        donorName: demoPayload.donorName,
        email: demoPayload.email,
        message: demoPayload.message,
        isAnonymous: demoPayload.isAnonymous,
        createdAt: demoPayload.createdAt,
        causeId: demoPayload.causeId,
        causeTitle: cause?.title || "RefreeG Campaign",
        causeRaised: Number(cause?.raised || 0) + demoPayload.amount,
        causeGoal: Number(cause?.goal || 0),
      },
    });
  }

  const isSuccessful = await Paystack.verifyTransaction(reference);

  if (!isSuccessful) {
    return apiSuccess({
      verified: false,
      message: "Transaction was not successful or could not be verified",
    });
  }

  // Process the charge to create/update the donation record, sync milestones, record rewards
  try {
    await processSuccessfulCharge(reference);
  } catch (err: any) {
    console.error(
      "Failed to process donation during mobile verification:",
      err,
    );
  }

  // Retrieve the full donation details for the mobile receipt
  const donation = await prisma.donation.findFirst({
    where: { paystack_reference: reference },
    include: {
      cause: {
        select: {
          id: true,
          title: true,
          raised: true,
          goal: true,
          category: true,
        },
      },
    },
  });

  return apiSuccess({
    verified: true,
    reference,
    donation: donation
      ? {
          id: donation.id,
          amount: Number(donation.amount),
          tipAmount: Number(donation.tip_amount || 0),
          donorName: donation.name,
          email: donation.email,
          message: donation.message,
          isAnonymous: donation.is_anonymous,
          createdAt: donation.createdAt,
          causeId: donation.causeId,
          causeTitle: donation.cause?.title,
          causeRaised: Number(donation.cause?.raised || 0),
          causeGoal: Number(donation.cause?.goal || 0),
        }
      : null,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    return await handleVerification(reference);
  } catch (error: any) {
    console.error("Mobile API Payment Verification Error (GET):", error);
    return apiError(error.message || "Failed to verify payment", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reference = body?.reference;
    return await handleVerification(reference);
  } catch (error: any) {
    console.error("Mobile API Payment Verification Error (POST):", error);
    return apiError(error.message || "Failed to verify payment", 500);
  }
}
