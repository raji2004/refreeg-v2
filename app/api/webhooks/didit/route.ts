import { NextResponse } from "next/server";
import crypto from "crypto";
import { processDiditVerificationResult } from "@/services/didit-kyc";

/**
 * Verifies the HMAC-SHA256 signature from Didit's webhook.
 * Didit sends the signature in the `X-Signature-V2` header.
 * Returns true if the signature is valid, false otherwise.
 *
 * FAILS CLOSED in production if DIDIT_WEBHOOK_SECRET is not configured.
 */
function verifyDiditWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Didit Webhook] DIDIT_WEBHOOK_SECRET is not configured in production — rejecting request (fail-closed)",
      );
      return false;
    }
    console.warn(
      "[Didit Webhook] DIDIT_WEBHOOK_SECRET not set — skipping signature verification in development/test",
    );
    return true;
  }

  if (!signatureHeader) {
    console.error("[Didit Webhook] Missing X-Signature-V2 header");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    // If the signature header is not valid hex or length mismatch, comparison fails
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Read the raw body for signature verification
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature-v2");

    // Verify HMAC signature
    if (!verifyDiditWebhookSignature(rawBody, signatureHeader)) {
      console.error("[Didit Webhook] Invalid signature — rejecting request");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    console.log("Didit webhook received:", body);

    const result = await processDiditVerificationResult(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to process verification" },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      success: true,
      ...(result.message && { message: result.message }),
    });
  } catch (error) {
    console.error("Didit webhook unhandled error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
