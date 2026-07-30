import { NextRequest, NextResponse } from "next/server";
import Flutterwave from "@/services/flutterwave";
import { TransactionData } from "@/types";

const MIN_DONATION_AMOUNT = 1; // Minimum donation per currency can be handled dynamically, but for simplicity let's stick to 1 or similar for now. Actually, let's just make sure amount > 0.

export async function POST(request: NextRequest) {
  try {
    const data: TransactionData = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (Number(data.amount) <= 0) {
      return NextResponse.json(
        { error: `Minimum donation amount must be greater than 0` },
        { status: 400 }
      );
    }

    const response = await Flutterwave.initializeTransaction(data);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Flutterwave payment initialization error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to initialize payment",
        success: false,
      },
      { status: 500 }
    );
  }
}
