import { NextRequest, NextResponse } from "next/server";
import type { PaymentProviderType } from "@/types";
import Flutterwave from "@/services/flutterwave";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";

export async function POST(request: NextRequest) {
  try {
    const { reference, provider, transaction_id } = (await request.json()) as {
      reference?: string;
      provider?: PaymentProviderType;
      transaction_id?: string;
    };

    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference is required" },
        { status: 400 },
      );
    }

    if (provider === "flutterwave") {
      let full: any;
      if (transaction_id) {
        full = await Flutterwave.verifyTransactionFull(transaction_id);
      } else {
        full = await Flutterwave.verifyByReferenceFull(reference);
      }

      if (!full || full.status !== "successful") {
        return NextResponse.json({ success: true, verified: false });
      }

      try {
        const meta = full.meta || {};
        if (meta.cause_id) {
          const { createDonation } = await import("@/actions");
          await createDonation(
            String(meta.cause_id),
            meta.user_id ? String(meta.user_id) : null,
            {
              amount: Number(meta.amount),
              name: String(meta.customer_name || ""),
              email: String(meta.email || full.customer?.email || ""),
              message: String(meta.message || ""),
              isAnonymous:
                meta.is_anonymous === "true" || meta.is_anonymous === true,
              tip_amount: Number(meta.tip_amount || 0),
            },
            undefined,
            reference,
            "flutterwave",
            meta.ref_v1 ? String(meta.ref_v1) : undefined,
          );
        }
      } catch (donationErr) {
        console.warn(
          "Flutterwave verify fallback donation creation skipped:",
          (donationErr as Error).message,
        );
      }

      return NextResponse.json({ success: true, verified: true });
    }

    const isSuccessful = await Paystack.verifyTransaction(reference);

    if (isSuccessful) {
      try {
        await processSuccessfulCharge(reference);
      } catch (processingError) {
        console.error(
          "Failed to record donation during payment verification:",
          processingError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      verified: isSuccessful,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify payment",
        success: false,
      },
      { status: 500 },
    );
  }
}
