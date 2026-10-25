import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import { assertCauseAcceptingDonations } from "@/lib/proof-milestones";

const MIN_DONATION_AMOUNT = 100;
const MAX_DONATION_AMOUNT = 10_000_000;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return apiError("Missing required fields (amount, email, causeId)", 400);
    }

    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount < MIN_DONATION_AMOUNT) {
      return apiError(
        `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}`,
        400,
      );
    }

    if (numAmount > MAX_DONATION_AMOUNT) {
      return apiError(
        `Maximum donation amount is ₦${MAX_DONATION_AMOUNT.toLocaleString()}`,
        400,
      );
    }

    try {
      await assertCauseAcceptingDonations(data.causeId);
    } catch (e: any) {
      return apiError(
        e.message || "This cause is not accepting donations currently",
        403,
      );
    }

    // Set callback URL for mobile deep link if not provided
    const callbackUrl = data.callback_url || "refreeg://payment/verify";

    // Recalculate fees on the server to prevent spoofing
    const serviceFee = calculateServiceFee(numAmount);
    const providerFee = calculateProviderFee(numAmount, "paystack");
    const tipAmount = Number(data.tipAmount || data.tip_amount || 0);

    // Get cause creator's subaccount if exists
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cause = uuidRegex.test(data.causeId)
      ? await prisma.cause.findUnique({
          where: { id: data.causeId },
          include: {
            user: {
              select: { subAccountCode: true },
            },
          },
        })
      : null;

    const subaccounts = cause?.user?.subAccountCode
      ? [{ subaccount: cause.user.subAccountCode, share: numAmount * 100 }]
      : undefined;

    let channels: string[] | undefined = undefined;
    if (data.channel === "card") {
      channels = ["card"];
    } else if (data.channel === "bank_transfer") {
      channels = ["bank_transfer"];
    } else if (data.channel === "ussd") {
      channels = ["ussd"];
    } else if (data.channel === "opay") {
      channels = ["bank"];
    }

    const response = await Paystack.initializeTransaction({
      amount: numAmount,
      email: data.email,
      causeId: data.causeId,
      full_name: data.isAnonymous
        ? "Anonymous"
        : data.donorName || data.name || data.full_name || "Supporter",
      serviceFee,
      providerFee,
      tipAmount,
      callbackUrl,
      subaccounts,
      message: data.message || "",
      isAnonymous: Boolean(data.isAnonymous),
      id: data.userId || data.user_id,
      referrer_code: data.referrer_code,
      channels,
    });

    return apiSuccess({
      ...response,
      breakdown: {
        amount: numAmount,
        serviceFee,
        providerFee,
        tipAmount,
        total: numAmount + serviceFee + providerFee + tipAmount,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Payment Initialization Error:", error);
    return apiError(error.message || "Failed to initialize payment", 500);
  }
}
