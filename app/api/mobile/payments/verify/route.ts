import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import Paystack from "@/services/paystack";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return apiError("Missing payment reference", 400);
    }

    const response = await Paystack.verifyTransaction(reference);

    return apiSuccess(response);
  } catch (error: any) {
    console.error("Mobile API Payment Verification Error:", error);
    return apiError(error.message || "Failed to verify payment", 500);
  }
}
