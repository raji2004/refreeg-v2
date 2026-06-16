"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recordEvent } from "@/actions/event-reward-actions";

export async function getRecipientSolanaWallet(causeId: string): Promise<string | null> {
  try {
    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      select: {
        user: {
          select: { solana_wallet: true }
        }
      }
    });
    
    return cause?.user?.solana_wallet ?? null;
  } catch (error) {
    console.error("Error fetching recipient Solana wallet:", error);
    return null;
  }
}

export async function getRecipientPolygonWallet(causeId: string): Promise<string | null> {
  try {
    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      select: {
        user: {
          select: { crypto_wallets: true }
        }
      }
    });

    const wallets = cause?.user?.crypto_wallets as { ethereum?: string } | null;
    return wallets?.ethereum ?? null;
  } catch (error) {
    console.error("Error fetching recipient Polygon wallet:", error);
    return null;
  }
}

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

export async function createCryptoDonation(data: CreateCryptoDonationParams) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the crypto donation record
      const donation = await tx.crypto_donations.create({
        data: {
          cause_id: data.cause_id,
          user_id: data.user_id || null,
          amount_in_naira: data.amount_in_naira,
          amount_in_crypto: data.amount_in_crypto,
          status: data.status,
          tx_hash: data.tx_hash || null,
          tx_signature: data.tx_signature,
          donor_wallet_address: data.donor_wallet_address || null,
          recipient_address: data.recipient_address,
          network: data.network,
          currency: data.currency,
        }
      });

      // 2. Increment the cause raised amount
      await tx.cause.update({
        where: { id: data.cause_id },
        data: { raised: { increment: data.amount_in_naira } }
      });

      return donation;
    });

    // Fire off events if it was a registered user
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
            currency: data.currency
          },
        });
      } catch (eventError) {
        console.error("Error recording crypto donation event:", eventError);
      }
    }

    // Emit SSE event
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
