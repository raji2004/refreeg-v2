import { NextRequest, NextResponse } from "next/server";
import type { PaymentProviderType } from "@/types";
import Flutterwave from "@/services/flutterwave";
import Paystack from "@/services/paystack";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";

export async function POST(request: NextRequest) {
  try {
    const { reference, provider, transaction_id } = await request.json() as {
      reference?: string;
      provider?: PaymentProviderType;
      transaction_id?: string;
    };

    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference is required" },
        { status: 400 }
      );
    }

    if (provider === "flutterwave") {
      // Use numeric transaction_id to verify (works in test AND live mode).
      // Fall back to tx_ref lookup only if no ID provided.
      let full: any;
      if (transaction_id) {
        full = await Flutterwave.verifyTransactionFull(transaction_id);
      } else {
        full = await Flutterwave.verifyByReferenceFull(reference);
      }

      if (!full || full.status !== "successful") {
        return NextResponse.json({ success: true, verified: false });
      }

      // Fallback: create the donation here in case the webhook hasn't fired yet.
      // createDonation is idempotent — it will skip if a donation with this
      // tx_ref already exists, so there's no risk of double-counting.
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
              isAnonymous: meta.is_anonymous === "true" || meta.is_anonymous === true,
              tip_amount: Number(meta.tip_amount || 0),
            },
            undefined,
            reference,
            "flutterwave"
          );
        }
      } catch (donationErr) {
        // Non-fatal — webhook may already have saved it
        console.warn("Flutterwave verify fallback donation creation skipped:", (donationErr as Error).message);
      }

      return NextResponse.json({ success: true, verified: true });
    }

    // Paystack path (unchanged)
    const isSuccessful = await Paystack.verifyTransaction(reference);

    if (isSuccessful) {
      // Record the donation as soon as the donor is redirected back, instead
      // of relying solely on the Paystack webhook (which may be delayed,
      // misconfigured, or unreachable). createDonation is idempotent on the
      // reference, so this is safe even if the webhook also processes it.
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
      { status: 500 }
    );
  }
}
