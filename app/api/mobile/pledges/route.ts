import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { createPledge } from "@/actions/pledge-actions";
import Paystack from "@/services/paystack";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.causeId ||
      !body.amount ||
      !body.reminderDate ||
      !body.name ||
      !body.email
    ) {
      return apiError(
        "Missing required fields (causeId, amount, reminderDate, name, email)",
        400,
      );
    }

    const numAmount = Number(body.amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return apiError("Minimum pledge amount is ₦100", 400);
    }

    const pledgeData = {
      causeId: body.causeId,
      amount: numAmount,
      reminderDate: body.reminderDate,
      name: body.name,
      email: body.email,
      note: body.note,
      causeTitle: body.causeTitle,
    };

    const result = await createPledge(pledgeData);

    if (result.error || !result.data) {
      return apiError(result.error || "Failed to create pledge", 400);
    }

    // If donor chose automatic fulfillment on reminder date, initialize ₦50 Paystack authorization
    if (body.autoCharge === true) {
      try {
        const initResponse = await Paystack.initializeTransaction({
          amount: PLEDGE_VERIFICATION_AMOUNT_NGN, // ₦50
          email: body.email,
          causeId: body.causeId,
          full_name: body.name,
          serviceFee: 0,
          providerFee: 0,
          callbackUrl: body.callbackUrl || "refreeg://pledge/verify",
          pledgeFlow: "authorization",
          pledgeId: result.data.id,
          pledgeFutureAmount: numAmount,
          reminderDate: body.reminderDate,
        });

        return apiSuccess(
          {
            pledge: result.data,
            autoCharge: true,
            authorization_url: initResponse.authorization_url,
            reference: initResponse.reference,
            access_code: initResponse.access_code,
          },
          201,
        );
      } catch (paystackError: any) {
        console.error("Paystack Pledge Auth Init Error:", paystackError);
        return apiSuccess(
          {
            pledge: result.data,
            autoCharge: false,
            warning:
              "Pledge saved, but card authorization failed. Donor will receive email reminders.",
          },
          201,
        );
      }
    }

    return apiSuccess({ pledge: result.data, autoCharge: false }, 201);
  } catch (error: any) {
    console.error("Mobile API Create Pledge Error:", error);
    return apiError("Internal server error", 500);
  }
}
