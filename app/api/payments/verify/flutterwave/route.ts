import { NextRequest, NextResponse } from "next/server";
import Flutterwave from "@/services/flutterwave";

export async function POST(request: NextRequest) {
  try {
    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const isSuccessful = await Flutterwave.verifyTransaction(transaction_id);

    return NextResponse.json({
      success: true,
      verified: isSuccessful,
    });
  } catch (error: any) {
    console.error("Flutterwave payment verification error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify payment",
        success: false,
      },
      { status: 500 }
    );
  }
}
