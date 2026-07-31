import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";

export async function GET(request: NextRequest) {
  try {
    const banks = await Paystack.listBanks();

    return NextResponse.json({
      success: true,
      data: banks,
    });
  } catch (error: any) {
    console.error("Error fetching banks:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch banks list",
        success: false,
      },
      { status: 500 }
    );
  }
}
