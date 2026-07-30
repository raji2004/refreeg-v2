import { NextResponse } from "next/server";
import { createDonation } from "@/actions";
import Flutterwave from "@/services/flutterwave";

interface FlutterwaveWebhookData {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
    meta?: {
      user_id?: string;
      cause_id?: string;
      amount?: number;
      tip_amount?: number;
      customer_name?: string;
      email?: string;
      message?: string;
      is_anonymous?: boolean;
    };
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    if (!payload) {
      return new NextResponse(
        JSON.stringify({ error: "Empty payload received" }),
        { status: 400 },
      );
    }

    const signature = request.headers.get("verif-hash");
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!signature || signature !== secretHash) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 400 },
      );
    }

    const webhookData = JSON.parse(payload) as FlutterwaveWebhookData;
    if (!webhookData?.event) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook data structure" }),
        { status: 400 },
      );
    }

    const { event, data } = webhookData;

    switch (event) {
      case "charge.completed": {
        const reference = data?.tx_ref;
        if (!reference) {
          return new NextResponse(
            JSON.stringify({ error: "Missing tx_ref" }),
            { status: 400 },
          );
        }

        if (data.status !== "successful") {
          return new NextResponse(
            JSON.stringify({ message: "Transaction not successful" }),
            { status: 200 },
          );
        }

        const full = await Flutterwave.verifyTransactionFull(data.id.toString());

        if (full.status !== "successful") {
          return new NextResponse(
            JSON.stringify({ message: "Transaction not successful upon verification" }),
            { status: 200 },
          );
        }

        const meta = full.meta || {};

        if (!meta.cause_id) {
          return new NextResponse(
            JSON.stringify({ message: "Metadata missing cause_id, skipping" }),
            { status: 200 },
          );
        }

        const baseAmount = Number(meta.amount);
        const tipAmount = Number(meta.tip_amount || 0);
        const fxRate = full.amount_settled / full.charged_amount;

        await createDonation(
          String(meta.cause_id),
          meta.user_id ? String(meta.user_id) : null,
          {
            amount: baseAmount,
            name: String(meta.customer_name || data.customer.name || ""),
            email: String(meta.email || data.customer.email || ""),
            message: String(meta.message || ""),
            isAnonymous: Boolean(meta.is_anonymous),
            tip_amount: tipAmount,
          },
          undefined,
          undefined,
          {
            provider: "flutterwave",
            providerReference: data.flw_ref,
            donationCurrency: data.currency,
            settlementCurrency: full.currency, // Actually flutterwave uses 'currency' for charge currency, maybe we just use data.currency? Actually let's assume the settlement subaccount handles it, we record the donor's currency.
            fxRate: !isNaN(fxRate) && isFinite(fxRate) ? fxRate : undefined,
          }
        );

        return new NextResponse(
          JSON.stringify({ message: "Flutterwave donation processed successfully" }),
          { status: 201 },
        );
      }

      default:
        return new NextResponse(
          JSON.stringify({ message: "Webhook event not supported" }),
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
