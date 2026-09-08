import { NextRequest, NextResponse } from "next/server";
import { createDualSubaccounts } from "@/services/payment-provider";
import type { ICreateSubaccount } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const data: ICreateSubaccount = await request.json();

    if (!data.account_number || !data.bank_code || !data.business_name) {
      return NextResponse.json(
        {
          error: "Account number, bank code, and business name are required",
          success: false,
        },
        { status: 400 }
      );
    }

    // Create subaccounts on BOTH providers simultaneously
    const result = await createDualSubaccounts(data);

    return NextResponse.json({
      success: true,
      data: {
        // Paystack subaccount (backward compatible shape)
        subaccount_code: result.paystack?.subaccount_code || null,
        account_number: result.paystack?.account_number || data.account_number,
        // Flutterwave subaccount
        flutterwave_sub_account_id: result.flutterwave?.subaccount_id || null,
      },
    });
  } catch (error: any) {
    console.error("Error creating subaccounts:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create subaccount",
        success: false,
      },
      { status: error.response?.status || 500 }
    );
  }
}
