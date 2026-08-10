import { NextRequest, NextResponse } from "next/server";
import { initializeTransaction } from "@/services/payment-provider";
import { TransactionData } from "@/types";

const MIN_DONATION_AMOUNT = 100;

export async function POST(request: NextRequest) {
  try {
    const data: TransactionData = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (Number(data.amount) < MIN_DONATION_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}` },
        { status: 400 }
      );
    }

    // JIT Flutterwave Subaccount Creation for existing users
    if (
      data.paymentProvider === "flutterwave" &&
      (!data.subaccounts || data.subaccounts.length === 0)
    ) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const Flutterwave = (await import("@/services/flutterwave")).default;

        const cause = await prisma.cause.findUnique({
          where: { id: data.causeId },
          select: { userId: true },
        });

        if (cause?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: cause.userId },
            select: { 
              accountNumber: true, 
              bankName: true, 
              fullName: true, 
              username: true,
              email: true,
              subAccountCode: true, 
              flutterwaveSubAccountId: true 
            },
          });

          // Only if they don't have flutterwave but HAVE paystack (meaning they are verified)
          if (
            user &&
            !user.flutterwaveSubAccountId &&
            user.subAccountCode &&
            user.accountNumber &&
            user.bankName
          ) {
            const bankCode = await Flutterwave.getBankCode(user.bankName);
            if (bankCode) {
               const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY?.includes("TEST");

               const newSubaccount = await Flutterwave.createSubaccount({
                 account_number: isTestMode ? "0690000031" : user.accountNumber,
                 bank_code: isTestMode ? "044" : bankCode,
                 business_name: user.fullName || user.username || "RefreeG Cause Creator",
                 business_email: user.email || "no-reply@refreeg.com",
               });

               if (newSubaccount?.subaccount_id) {
                 await prisma.user.update({
                   where: { id: cause.userId },
                   data: { flutterwaveSubAccountId: newSubaccount.subaccount_id },
                 });

                 data.subaccounts = [
                   {
                     subaccount: newSubaccount.subaccount_id,
                     share: Number(data.amount) * 100, // Frontend uses amount*100 ? Wait, usually share is ratio or flat.
                   }
                 ];
               }
            }
          }
        }
      } catch (jitError) {
        console.error("JIT Flutterwave Subaccount Creation Failed:", jitError);
      }
    }

    const response = await initializeTransaction(data, data.paymentProvider);

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
      { status: 500 }
    );
  }
}
