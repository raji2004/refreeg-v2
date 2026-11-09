import { NextRequest, NextResponse } from "next/server";
import { initializeTransaction } from "@/services/payment-provider";
import { TransactionData } from "@/types";
import { assertCauseAcceptingDonations } from "@/lib/proof-milestones";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";

const MIN_DONATION_AMOUNT = 100;
const MAX_DONATION_AMOUNT = 10_000_000;

export async function POST(request: NextRequest) {
  try {
    const data: TransactionData = await request.json();

    if (!data.amount || !data.email || !data.causeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const numAmount = Number(data.amount);
    if (numAmount < MIN_DONATION_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum donation amount is ₦${MIN_DONATION_AMOUNT}` },
        { status: 400 },
      );
    }

    if (numAmount > MAX_DONATION_AMOUNT) {
      return NextResponse.json(
        {
          error: `Maximum donation amount is ₦${MAX_DONATION_AMOUNT.toLocaleString()}`,
        },
        { status: 400 },
      );
    }

    try {
      await assertCauseAcceptingDonations(data.causeId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    // Extract referral code from payload or ref_v1 cookie
    const cookieRef = request.cookies?.get("ref_v1")?.value;
    if (!data.referrer_code && cookieRef) {
      data.referrer_code = cookieRef;
    }

    // Force recalculate fees on the server to prevent spoofing
    // and correctly apply Flutterwave vs Paystack logic
    data.serviceFee = calculateServiceFee(Number(data.amount));
    data.providerFee = calculateProviderFee(
      Number(data.amount),
      data.paymentProvider as "paystack" | "flutterwave",
    );

    // Authoritatively bind creator subaccount from database to prevent client spoofing
    const { prisma } = await import("@/lib/prisma");
    const causeRecord = await prisma.cause.findUnique({
      where: { id: data.causeId },
      select: {
        userId: true,
        user: {
          select: {
            subAccountCode: true,
            flutterwaveSubAccountId: true,
            accountNumber: true,
            bankName: true,
            fullName: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (data.paymentProvider === "flutterwave") {
      let flwSubId = causeRecord?.user?.flutterwaveSubAccountId;

      // JIT Flutterwave Subaccount Creation for existing users if missing
      if (!flwSubId && causeRecord?.user?.subAccountCode && causeRecord.user.accountNumber && causeRecord.user.bankName) {
        try {
          const Flutterwave = (await import("@/services/flutterwave")).default;
          const bankCode = await Flutterwave.getBankCode(causeRecord.user.bankName);
          if (bankCode) {
            const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY?.includes("TEST");
            const newSubaccount = await Flutterwave.createSubaccount({
              account_number: isTestMode ? "0690000031" : causeRecord.user.accountNumber,
              bank_code: isTestMode ? "044" : bankCode,
              business_name: causeRecord.user.fullName || causeRecord.user.username || "RefreeG Cause Creator",
              business_email: causeRecord.user.email || "no-reply@refreeg.com",
            });
            flwSubId = newSubaccount?.subaccount_id || null;
            if (flwSubId) {
              await prisma.user.update({
                where: { id: causeRecord.userId },
                data: { flutterwaveSubAccountId: flwSubId },
              });
            }
          }
        } catch (jitErr) {
          console.error("JIT Flutterwave subaccount error:", jitErr);
        }
      }

      if (flwSubId) {
        data.subaccounts = [{ subaccount: flwSubId, share: Number(data.amount) * 100 }];
      } else {
        data.subaccounts = [];
      }
    } else {
      // Paystack: authoritatively bind from creator DB record
      const paystackSubCode = causeRecord?.user?.subAccountCode;
      if (paystackSubCode) {
        data.subaccounts = [{ subaccount: paystackSubCode, share: Number(data.amount) * 100 }];
      } else {
        data.subaccounts = [];
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
      { status: 500 },
    );
  }
}
