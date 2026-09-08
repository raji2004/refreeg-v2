import { NextRequest, NextResponse } from "next/server";
import { verifyAccountNumber } from "@/services/payment-provider";
import type { PaymentProviderType } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { accountNumber, bankCode, provider } = await request.json() as {
      accountNumber?: string;
      bankCode?: string;
      provider?: PaymentProviderType;
    };

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        {
          error: "Account number and bank code are required",
          success: false,
        },
        { status: 400 }
      );
    }
    const verification = await verifyAccountNumber(
      accountNumber,
      bankCode,
      provider,
    );

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    console.error("Error verifying account:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify account number",
        success: false,
      },
      { status: error.response?.status || 500 }
    );
  }
}
