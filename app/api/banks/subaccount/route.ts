import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";
import Flutterwave from "@/services/flutterwave";
import type { ICreateSubaccount } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { country = "NG", ...subaccountData } = data;

    if (!subaccountData.account_number || !subaccountData.bank_code || !subaccountData.business_name) {
      return NextResponse.json(
        {
          error: "Account number, bank code, and business name are required",
          success: false,
        },
        { status: 400 }
      );
    }

    let subaccountResponse: any = {};
    if (country === "NG") {
      const paystackSub = await Paystack.createSubaccount(subaccountData as ICreateSubaccount);
      subaccountResponse.subaccount_code = paystackSub.subaccount_code;
    } else {
      const fwSub = await Flutterwave.createSubaccount({
        account_bank: subaccountData.bank_code,
        account_number: subaccountData.account_number,
        business_name: subaccountData.business_name,
        country: country,
        split_type: "percentage",
        split_value: 0.1, // Flutterwave usually requires split value
      });
      subaccountResponse.flutterwave_subaccount_id = fwSub.subaccount_id;
    }

    return NextResponse.json({
      success: true,
      data: subaccountResponse,
    });
  } catch (error: any) {
    console.error("Error creating subaccount:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create subaccount",
        success: false,
      },
      { status: error.response?.status || 500 }
    );
  }
}
