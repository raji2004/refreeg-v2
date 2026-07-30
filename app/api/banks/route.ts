import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";
import Flutterwave from "@/services/flutterwave";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get("country") || "NG";

    let banks;
    if (country === "NG") {
      banks = await Paystack.listBanks();
    } else {
      banks = await Flutterwave.listBanks(country);
    }

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
