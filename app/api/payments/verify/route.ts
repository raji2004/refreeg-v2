import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/services/payment-provider";
import type { PaymentProviderType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { reference, provider } = await request.json() as {
      reference?: string;
      provider?: PaymentProviderType;
    };

    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference is required" },
        { status: 400 }
      );
    }

    const isSuccessful = await verifyTransaction(reference, provider);

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
