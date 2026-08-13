import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference is required" },
        { status: 400 }
      );
    }

    const isSuccessful = await Paystack.verifyTransaction(reference);

    if (isSuccessful) {
      // Record the donation as soon as the donor is redirected back, instead
      // of relying solely on the Paystack webhook (which may be delayed,
      // misconfigured, or unreachable). createDonation is idempotent on the
      // reference, so this is safe even if the webhook also processes it.
      try {
        await processSuccessfulCharge(reference);
      } catch (processingError) {
        console.error(
          "Failed to record donation during payment verification:",
          processingError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      verified: isSuccessful,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify payment",
        success: false,
      },
      { status: 500 }
    );
  }
}
