"use server";

import { createClient } from "@/lib/supabase/server";
import { processMatchingForDonation } from "./matching-pool-actions";

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
  userId?: string | null;
}

export async function recordCryptoDonation(donationData: CryptoDonationData) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user server-side
    const { data: { user } } = await supabase.auth.getUser();
    
    // Insert crypto donation record with idempotency
    const { data, error: cryptoError } = await supabase
      .from("crypto_donations")
      .upsert([
        {
          cause_id: donationData.causeId,
          tx_signature: donationData.txHash,
          amount_in_sol: donationData.amountInCrypto,
          amount_in_naira: donationData.amountInNaira,
          wallet_address: donationData.donorWalletAddress,
          recipient_address: donationData.recipientAddress,
          user_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
          payment_method: donationData.currency,
          status: "pending",
          network: donationData.network,
          currency: donationData.currency,
          wallet_type: donationData.walletType,
        },
      ], { onConflict: "tx_signature" })
      .select();

    if (cryptoError) {
      console.error("Error recording crypto donation:", cryptoError);
      throw new Error("Failed to record crypto donation");
    }


    try {
      const matchingResult = await processMatchingForDonation(
        donationData.causeId,
        data[0].id,
        'crypto_donation',
        donationData.amountInNaira
      );
      
      if (matchingResult.success && matchingResult.matched_amount > 0) {
        console.log(`Crypto donation matched! Added ${matchingResult.matched_amount} to cause`);
      }
    } catch (matchingError) {
      console.error("Error processing matching for crypto donation:", matchingError);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Crypto donation error:", error);
    throw error;
  }
}

export async function confirmCryptoDonation(txHash: string) {
  try {
    const supabase = await createClient();
    
    // Update donation status to completed
    const { data: donation, error: updateError } = await supabase
      .from("crypto_donations")
      .update({ status: "completed" })
      .eq("tx_signature", txHash)
      .select()
      .single();

    if (updateError) {
      console.error("Error confirming crypto donation:", updateError);
      throw new Error("Failed to confirm crypto donation");
    }

    if (donation) {
      // Now increment the cause's raised amount
      const { error: incrementError } = await supabase.rpc("increment_cause_raised", {
        cause_id: donation.cause_id,
        amount: donation.amount_in_naira,
      });

      if (incrementError) {
        console.error("Error updating cause raised amount:", incrementError);
        throw new Error("Failed to update cause progress");
      }

      // Process matching for this confirmed crypto donation
      try {
        const matchingResult = await processMatchingForDonation(
          donation.cause_id,
          donation.id,
          'crypto_donation',
          donation.amount_in_naira
        );
        
        if (matchingResult.success && matchingResult.matched_amount > 0) {
          console.log(`Crypto donation matched! Added ${matchingResult.matched_amount} to cause`);
        }
      } catch (matchingError) {
        console.error("Error processing matching for crypto donation:", matchingError);
      }
    }

    return { success: true, data: donation };
  } catch (error) {
    console.error("Crypto donation confirmation error:", error);
    throw error;
  }
}

export async function getCryptoDonationsForCause(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("crypto_donations")
      .select("*")
      .eq("cause_id", causeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching crypto donations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getCryptoDonationsForCause:", error);
    return [];
  }
}
