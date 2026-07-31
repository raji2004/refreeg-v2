import { NextRequest, NextResponse } from "next/server";
import Paystack from "@/services/paystack";
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

    const subaccount = await Paystack.createSubaccount(data);

    return NextResponse.json({
      success: true,
      data: subaccount,
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
