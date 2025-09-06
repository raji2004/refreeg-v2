"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CryptoDonationData {
  causeId: string;
  txHash: string;
  amountInCrypto: number;
  amountInNaira: number;
  donorWalletAddress: string;
  recipientAddress: string;
  userId: string; // Use actual user ID or anonymous UUID
  network: string;
  currency: string;
  walletType: string;
}

export async function recordCryptoDonation(donationData: CryptoDonationData) {
  const supabase = await createClient();

  try {
    // For anonymous donations, we'll use a special UUID that represents anonymous users
    const anonymousUserId = "00000000-0000-0000-0000-000000000000";
    const userId = donationData.userId || anonymousUserId;

    // Record the crypto donation
    const { data: cryptoDonation, error: cryptoError } = await supabase
      .from("crypto_donations")
      .insert({
        cause_id: donationData.causeId,
        tx_signature: donationData.txHash, // Required field
        tx_hash: donationData.txHash, // Also set for consistency
        amount_in_sol: donationData.amountInCrypto, // Required field (using crypto amount)
        amount_in_crypto: donationData.amountInCrypto,
        amount_in_naira: donationData.amountInNaira,
        wallet_address: donationData.donorWalletAddress, // Use wallet_address (required)
        donor_wallet_address: donationData.donorWalletAddress, // Also set for consistency
        recipient_address: donationData.recipientAddress,
        user_id: userId,
        payment_method: donationData.walletType, // Required field
        network: donationData.network,
        currency: donationData.currency,
        wallet_type: donationData.walletType,
        status: "completed",
      })
      .select()
      .single();

    if (cryptoError) {
      console.error("Error recording crypto donation:", cryptoError);
      throw new Error("Failed to record crypto donation");
    }

    // Update the cause's raised amount
    const { error: incrementError } = await supabase.rpc(
      "increment_cause_raised",
      {
        cause_id: donationData.causeId,
        amount: donationData.amountInNaira,
      }
    );

    if (incrementError) {
      console.error("Error incrementing cause raised amount:", incrementError);
      // Don't throw here as the donation was recorded successfully
    }

    // Revalidate the cause page to update the progress bar
    revalidatePath(`/causes/${donationData.causeId}`);
    revalidatePath("/causes");

    return cryptoDonation;
  } catch (error) {
    console.error("Error in recordCryptoDonation:", error);
    throw error;
  }
}

export async function getCryptoDonationsForCause(causeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("crypto_donations")
    .select("*")
    .eq("cause_id", causeId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching crypto donations:", error);
    return [];
  }

  return data || [];
}
