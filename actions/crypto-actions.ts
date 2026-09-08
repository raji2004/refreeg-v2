"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordEvent } from "@/actions/event-reward-actions";
import { syncMilestoneRequirements } from "@/lib/proof-milestones";

interface CreateCryptoDonationParams {
  cause_id: string;
  user_id?: string | null;
  amount_in_naira: number;
  amount_in_crypto: number;
  status: string;
  tx_hash?: string | null;
  tx_signature: string;
  donor_wallet_address?: string | null;
  recipient_address: string;
  network: string;
  currency: string;
}

/**
 * Records a crypto donation (usually called by the Breet Webhook after settlement)
 * and increments the campaign's raised total.
 */
export async function createCryptoDonation(data: CreateCryptoDonationParams) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the crypto donation record
      const donation = await tx.crypto_donations.create({
        data: {
          cause_id:
            data.cause_id && typeof data.cause_id === "string"
              ? data.cause_id.trim()
              : data.cause_id,

          user_id:
            data.user_id &&
            typeof data.user_id === "string" &&
            data.user_id.trim() !== ""
              ? data.user_id.trim()
              : null,

          amount_in_naira: data.amount_in_naira,
          amount_in_crypto: data.amount_in_crypto,
          status: data.status,

          // SANITIZE TX_HASH: If it's empty/falsy, force it to null instead of ""
          tx_hash:
            data.tx_hash &&
            typeof data.tx_hash === "string" &&
            data.tx_hash.trim() !== ""
              ? data.tx_hash.trim()
              : null,

          tx_signature: data.tx_signature,
          donor_wallet_address: data.donor_wallet_address || null,
          recipient_address: data.recipient_address,
          network: data.network,
          currency: data.currency,
        },
      });

      // 2. Increment the cause raised amount
      await tx.cause.update({
        where: { id: data.cause_id },
        data: { raised: { increment: data.amount_in_naira } },
      });

      return donation;
    });

    // 3. Sync Proof Milestones (Triggers the 25/50/75/100% compliance engine)
    try {
      await syncMilestoneRequirements(data.cause_id);
    } catch (e) {
      console.error("Error syncing proof milestones for crypto:", e);
    }

    // 4. Fire off reward events if it was a registered user
    if (data.user_id) {
      try {
        await recordEvent({
          type: "donation",
          userId: data.user_id,
          amount: data.amount_in_naira,
          metadata: {
            cause_id: data.cause_id,
            donation_id: result.id,
            is_crypto: true,
            network: data.network,
            currency: data.currency,
          },
        });
      } catch (eventError) {
        console.error("Error recording crypto donation event:", eventError);
      }
    }

    // 5. Emit SSE event for real-time dashboard updates
    try {
      const { eventBus } = await import("@/lib/event-bus");
      eventBus.emit("donation", {
        type: "donation",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Error emitting crypto donation SSE:", e);
    }

    // 6. Revalidate paths
    revalidatePath(`/causes/${data.cause_id}`);
    revalidatePath("/causes");
    revalidatePath("/");
    if (data.user_id) {
      revalidatePath("/dashboard/donations");
    }

    return result;
  } catch (error) {
    console.error("Error creating crypto donation:", error);
    throw error;
  }
}
