import { NextResponse } from "next/server";
import { createDonation, createSubscription } from "@/actions";
import {
  processPledgeAuthorizationSuccess,
  processPledgeScheduledChargeSuccess,
} from "@/lib/pledge-paystack";
import Paystack from "@/services/paystack";
import crypto from "crypto";

interface PaystackWebhookData {
  event: string;
  data: {
    reference?: string;
    subscription_code?: string;
    email_token?: string;
    amount: number;
    plan?: {
      interval: string;
    };
    metadata?: {
      user_id?: string;
      cause_id?: string;
      amount?: number;
      tip_amount?: number;
      customer_name?: string;
      email?: string;
      message?: string;
      is_anonymous?: boolean;
      plan?: string;
      pledge_flow?: string;
      pledge_id?: string;
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

    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      return new NextResponse(
        JSON.stringify({ error: "Missing webhook signature" }),
        { status: 400 },
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return new NextResponse(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500 },
      );
    }

    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(payload)
      .digest("hex");

    if (hash !== signature) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 400 },
      );
    }

    const webhookData = JSON.parse(payload) as PaystackWebhookData;
    if (!webhookData?.event) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid webhook data structure" }),
        { status: 400 },
      );
    }

    const { event, data } = webhookData;

    switch (event) {
      case "charge.success": {
        const reference = data?.reference;
        if (!reference) {
          return new NextResponse(
            JSON.stringify({ error: "Missing reference" }),
            { status: 400 },
          );
        }

        const full = (await Paystack.verifyTransactionFull(reference)) as {
          status?: string;
          metadata?: Record<string, string | number | boolean | undefined>;
        };

        if (full.status !== "success") {
          return new NextResponse(
            JSON.stringify({ message: "Transaction not successful" }),
            { status: 200 },
          );
        }

        const meta = full.metadata || {};

        if (String(meta.pledge_flow) === "authorization") {
          await processPledgeAuthorizationSuccess(reference);
          return new NextResponse(
            JSON.stringify({ message: "Pledge authorization stored" }),
            { status: 201 },
          );
        }

        if (String(meta.pledge_flow) === "scheduled_charge") {
          await processPledgeScheduledChargeSuccess(reference);
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
          reference,
        );

        return new NextResponse(
          JSON.stringify({ message: "Donation processed successfully" }),
          { status: 201 },
        );
      }

      case "subscription.create": {
        const metadata = data?.metadata;
        if (!metadata?.cause_id) {
          return new NextResponse(
            JSON.stringify({ message: "Metadata missing cause_id, skipping" }),
            { status: 200 },
          );
        }

        await createSubscription({
          user_id: metadata.user_id || undefined,
          cause_id: String(metadata.cause_id),
          paystack_subscription_code: data.subscription_code!,
          paystack_email_token: data.email_token,
          amount: Number(metadata.amount),
          interval: data.plan?.interval || "monthly",
          status: "active",
        });

        return new NextResponse(
          JSON.stringify({ message: "Subscription created successfully" }),
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
    console.error("Webhook processing error:", e);
    return new NextResponse(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Internal Error",
      }),
      { status: 500 },
    );
  }
}
