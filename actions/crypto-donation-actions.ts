"use server";

import { createClient } from "@/lib/supabase/server";

export interface CryptoDonationData {
  causeId: string;
  txHash: string;
  amountInCrypto: number;
  amountInNaira: number;
  donorWalletAddress: string;
  recipientAddress: string;
  network: string;
  currency: string;
  walletType: string;
  userId: string;
}

export async function recordCryptoDonation(donationData: CryptoDonationData) {
  const supabase = createClient();

  try {
    // Insert crypto donation record
    const { data, error: cryptoError } = await supabase
      .from("crypto_donations")
      .insert([
        {
          cause_id: donationData.causeId,
          tx_signature: donationData.txHash,
          amount_in_sol: donationData.amountInCrypto, // Using amount_in_sol for all crypto
          amount_in_naira: donationData.amountInNaira,
          wallet_address: donationData.donorWalletAddress,
          recipient_address: donationData.recipientAddress,
          user_id: donationData.userId || "00000000-0000-0000-0000-000000000000", // Anonymous user
          payment_method: donationData.currency,
          status: "completed",
          network: donationData.network,
          currency: donationData.currency,
          wallet_type: donationData.walletType,
        },
      ])
      .select();

    if (cryptoError) {
      console.error("Error recording crypto donation:", cryptoError);
      throw new Error("Failed to record crypto donation");
    }

    // Update the cause's raised amount
    const { error: updateError } = await supabase.rpc("increment_cause_raised", {
      cause_id: donationData.causeId,
      amount: donationData.amountInNaira,
    });

    if (updateError) {
      console.error("Error updating cause raised amount:", updateError);
      throw new Error("Failed to update cause progress");
    }

    return { success: true, data };
  } catch (error) {
    console.error("Crypto donation error:", error);
    throw error;
  }
}

export async function getCryptoDonationsForCause(causeId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("crypto_donations")
      .select("*")
      .eq("cause_id", causeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching crypto donations:", error);
      throw new Error("Failed to fetch crypto donations");
    }

    return data || [];
  } catch (error) {
    console.error("Error in getCryptoDonationsForCause:", error);
    return [];
  }
}
