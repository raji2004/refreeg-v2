import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";

export async function POST(request: NextRequest) {
  try {
    const { accountNumber, bankCode } = await request.json();

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        {
          error: "Account number and bank code are required",
          success: false,
        },
        { status: 400 }
      );
    }
    const verification = await Paystack.verifyAccountNumber(
      accountNumber,
      bankCode
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
