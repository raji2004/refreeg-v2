import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";
import { TransactionData } from "@/types";
import { assertCauseAcceptingDonations } from "@/lib/proof-milestones";

const MIN_DONATION_AMOUNT = 100;

export async function POST(request: NextRequest) {
  try {
    const data: TransactionData = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (Number(data.amount) < MIN_DONATION_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}` },
        { status: 400 },
      );
    }

    try {
      await assertCauseAcceptingDonations(data.causeId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    const response = await Paystack.initializeTransaction(data);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to initialize payment",
        success: false,
      },
      { status: 500 },
    );
  }
}
