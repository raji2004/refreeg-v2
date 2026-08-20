import { NextResponse, NextRequest } from "next/server";
import { createDonation } from "@/actions";
import Flutterwave from "@/services/flutterwave";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    if (!payload) {
      return new NextResponse(
        JSON.stringify({ error: "Empty payload received" }),
        { status: 400 },
      );
    }

    // Flutterwave uses a hash header for webhook verification
    const webhookHash = request.headers.get("verif-hash");
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!secretHash) {
      return new NextResponse(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500 },
      );
    }

    if (!webhookHash || webhookHash !== secretHash) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook hash" }),
        { status: 400 },
      );
    }

    const webhookData = JSON.parse(payload);
    if (!webhookData?.event) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook data structure" }),
        { status: 400 },
      );
    }

    const { event, data } = webhookData;

    switch (event) {
      case "charge.completed": {
        const txRef = data?.tx_ref;
        const transactionId = data?.id;

        if (!txRef) {
          return new NextResponse(
            JSON.stringify({ error: "Missing tx_ref" }),
            { status: 400 },
          );
        }

        // Verify the transaction independently (don't trust webhook data alone).
        // Prefer verifying by the numeric transaction ID (data.id) which works
        // in both test and live mode. Fall back to tx_ref lookup if no ID.
        let full: any;
        if (transactionId) {
          full = await Flutterwave.verifyTransactionFull(String(transactionId));
        } else {
          full = await Flutterwave.verifyByReferenceFull(txRef);
        }

        if (full.status !== "successful") {
          return new NextResponse(
            JSON.stringify({ message: "Transaction not successful" }),
            { status: 200 },
          );
        }

        const meta = full.meta || {};

        // Handle pledge authorization flow
        if (String(meta.pledge_flow) === "authorization") {
          // Import dynamically to keep the module boundary clean
          const { processPledgeAuthorizationSuccess } = await import(
            "@/lib/pledge-provider"
          );
          await processPledgeAuthorizationSuccess(txRef, "flutterwave");
          return new NextResponse(
            JSON.stringify({ message: "Pledge authorization stored" }),
            { status: 201 },
          );
        }

        // Handle pledge scheduled charge
        if (String(meta.pledge_flow) === "scheduled_charge") {
          const { processPledgeScheduledChargeSuccess } = await import(
            "@/lib/pledge-provider"
          );
          await processPledgeScheduledChargeSuccess(txRef, "flutterwave");
          return new NextResponse(
            JSON.stringify({ message: "Pledge charge processed" }),
            { status: 201 },
          );
        }

        if (!meta.cause_id) {
          return new NextResponse(
            JSON.stringify({ message: "Metadata missing cause_id, skipping" }),
            { status: 200 },
          );
        }

        const baseAmount = Number(meta.amount);
        const tipAmount = Number(meta.tip_amount || 0);

        await createDonation(
          String(meta.cause_id),
          meta.user_id ? String(meta.user_id) : null,
          {
            amount: baseAmount,
            name: String(meta.customer_name || ""),
            email: String(meta.email || ""),
            message: String(meta.message || ""),
            isAnonymous: Boolean(meta.is_anonymous),
            tip_amount: tipAmount,
          },
          undefined,
          txRef,
          "flutterwave",
          meta.ref_v1 ? String(meta.ref_v1) : undefined,
        );

        return new NextResponse(
          JSON.stringify({ message: "Donation processed successfully" }),
          { status: 201 },
        );
      }

      default:
        return new NextResponse(
          JSON.stringify({ message: "Webhook event not supported yet" }),
          { status: 200 },
        );
    }
  } catch (e) {
    console.error("Flutterwave webhook processing error:", e);
    return new NextResponse(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Internal Error",
      }),
      { status: 500 },
    );
  }
}
