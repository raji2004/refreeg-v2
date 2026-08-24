import { NextResponse } from "next/server";
import { createSubscription } from "@/actions";
import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";
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

        // FIRE-AND-FORGET: Process in background
        Promise.resolve().then(async () => {
          try {
            await processSuccessfulCharge(reference);
          } catch (bgError) {
            console.error("[Paystack Webhook Background] Failed:", bgError);
          }
        });

        // Return 200 OK immediately to Paystack
        return new NextResponse(
          JSON.stringify({
            message: "Donation received, processing in background",
          }),
          { status: 200 },
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

        // FIRE-AND-FORGET
        Promise.resolve().then(async () => {
          try {
            await createSubscription({
              user_id: metadata.user_id || undefined,
              cause_id: String(metadata.cause_id),
              paystack_subscription_code: data.subscription_code!,
              paystack_email_token: data.email_token,
              amount: Number(metadata.amount),
              interval: data.plan?.interval || "monthly",
              status: "active",
            });
          } catch (bgError) {
            console.error(
              "[Paystack Webhook Background] Subscription failed:",
              bgError,
            );
          }
        });

        return new NextResponse(
          JSON.stringify({ message: "Subscription received" }),
          { status: 200 },
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
