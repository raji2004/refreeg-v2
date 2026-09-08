import { NextRequest, NextResponse } from "next/server";
import { listBanks } from "@/services/payment-provider";
import type { PaymentProviderType } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get("provider") as PaymentProviderType | null;
    const banks = await listBanks(provider || undefined);

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
