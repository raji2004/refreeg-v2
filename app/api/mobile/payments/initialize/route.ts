import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import Paystack from "@/services/paystack";

const MIN_DONATION_AMOUNT = 100;

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return apiError("Missing required fields (amount, email, causeId)", 400);
    }

    if (Number(data.amount) < MIN_DONATION_AMOUNT) {
      return apiError(`Minimum donation amount is ₦${MIN_DONATION_AMOUNT}`, 400);
    }

    // Set callback URL for mobile deep link if provided, or default
    if (!data.callback_url) {
      data.callback_url = "refreeg://payment/verify";
    }

    const response = await Paystack.initializeTransaction(data);

    return apiSuccess(response);
  } catch (error: any) {
    console.error("Mobile API Payment Initialization Error:", error);
    return apiError(error.message || "Failed to initialize payment", 500);
  }
}
