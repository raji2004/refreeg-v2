// utils/webhook-utils.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "campaign.created"
  | "donation.success"
  | "campaign.completed"
  | "campaign.updated"
  | "campaign.reported"
  | "campaign.taken_down";

interface WebhookPayload {
  campaign_id?: string;
  campaign_title?: string;
  donation_id?: string;
  amount?: number;
  reason?: string;
  cancelled_at?: string;
  [key: string]: any;
}

/**
 * Dispatches a webhook notification to all active endpoints subscribed to the given event.
 */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  payload: WebhookPayload,
) {
  try {
    // 1. Fetch active webhooks for the user subscribed to this event
    const webhooks = await prisma.api_webhooks.findMany({
      where: {
        user_id: userId,
        is_active: true,
        events: {
          has: event, // PostgreSQL array contains check
        },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // 2. Dispatch to each endpoint
    const dispatchPromises = webhooks.map(async (webhook) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = JSON.stringify({
        event,
        created_at: new Date().toISOString(),
        payload,
      });

      // Generate HMAC-SHA256 signature
      const signaturePayload = `${timestamp}.${body}`;
      const hmac = crypto.createHmac("sha256", webhook.secret);
      const signature = hmac.update(signaturePayload).digest("hex");

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RefreeG-Signature": `t=${timestamp},v1=${signature}`,
            "User-Agent": "RefreeG-Webhook-Dispatcher/1.0",
          },
          body,
        });

        const responseText = await response.text();

        // Log the delivery attempt
        await prisma.api_webhook_logs.create({
          data: {
            webhook_id: webhook.id,
            event_type: event,
            payload: payload as any,
            status_code: response.status,
            response_body: responseText.slice(0, 1000), // Truncate long responses
            attempts: 1,
            created_at: new Date(),
          },
        });

        console.log(
          `[Webhook] Successfully dispatched to ${webhook.url} (${response.status})`,
        );
      } catch (dispatchError: any) {
        console.error(
          `[Webhook] Dispatch failed for ${webhook.url}:`,
          dispatchError,
        );

        // Log the failed attempt
        await prisma.api_webhook_logs.create({
          data: {
            webhook_id: webhook.id,
            event_type: event,
            payload: payload as any,
            status_code: null,
            response_body: dispatchError.message || "Failed to connect",
            attempts: 1,
            created_at: new Date(),
          },
        });
      }
    });

    // Wait for all dispatches to complete (settled - don't fail if one fails)
    await Promise.allSettled(dispatchPromises);
  } catch (error) {
    console.error(
      `[Webhook] Error dispatching webhooks for user ${userId}:`,
      error,
    );
    // Don't throw - webhook failures shouldn't break the main flow
  }
}
