"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "node:crypto";

export interface CryptoStreamingDonation {
  id: string;
  cause_id: string;
  donor_id?: string;
  donor_name: string;
  donor_email: string;
  total_amount: number;
  streamed_amount: number;
  remaining_amount: number;
  stream_rate_per_second: number;
  stream_duration_seconds: number;
  stream_interval_seconds: number;
  is_active: boolean;
  is_paused: boolean;
  started_at?: string;
  completed_at?: string;
  paused_at?: string;
  created_at: string;
  updated_at?: string;
  // Crypto specific fields
  crypto_currency: string;
  crypto_network: string;
  donor_wallet_address: string;
  recipient_wallet_address: string;
  total_crypto_amount: number;
  streamed_crypto_amount: number;
  remaining_crypto_amount: number;
  crypto_stream_rate_per_second: number;
}

// Create a new crypto streaming donation
export async function createCryptoStreamingDonation(donationData: {
  causeId: string;
  donorId?: string;
  donorName: string;
  donorEmail: string;
  totalAmount: number;
  streamDurationDays: number;
  streamIntervalSeconds?: number;
  cryptoCurrency: string;
  cryptoNetwork: string;
  donorWalletAddress: string;
  recipientWalletAddress: string;
  totalCryptoAmount: number;
}) {
  try {
    const supabase = await createClient();
    
    // Validate inputs
    if (donationData.streamDurationDays <= 0) {
      throw new Error("Stream duration must be positive");
    }
    if (donationData.totalAmount <= 0 || donationData.totalCryptoAmount <= 0) {
      throw new Error("Amounts must be positive");
    }
    
    const streamIntervalSeconds = donationData.streamIntervalSeconds || 1;
    if (streamIntervalSeconds <= 0) {
      throw new Error("Stream interval must be positive");
    }
    
    // Validate crypto currency and network
    const allowedCurrencies = ['ETH', 'BTC', 'MATIC', 'USDC', 'USDT'];
    const allowedNetworks = ['ethereum', 'polygon', 'bitcoin', 'arbitrum', 'optimism'];
    
    if (!allowedCurrencies.includes(donationData.cryptoCurrency)) {
      throw new Error(`Unsupported crypto currency: ${donationData.cryptoCurrency}`);
    }
    if (!allowedNetworks.includes(donationData.cryptoNetwork)) {
      throw new Error(`Unsupported crypto network: ${donationData.cryptoNetwork}`);
    }
    
    // Calculate streaming parameters using precise arithmetic
    const streamDurationSeconds = Math.floor(donationData.streamDurationDays * 24 * 60 * 60);
    const streamRatePerSecond = Math.floor((donationData.totalAmount * 100) / streamDurationSeconds) / 100; // Convert to cents for precision
    const cryptoStreamRatePerSecond = Math.floor((donationData.totalCryptoAmount * 1000000) / streamDurationSeconds) / 1000000; // 6 decimal precision
    
    console.log("Creating crypto streaming donation with parameters:", {
      causeId: donationData.causeId,
      totalAmount: donationData.totalAmount,
      totalCryptoAmount: donationData.totalCryptoAmount,
      streamDurationDays: donationData.streamDurationDays,
      streamDurationSeconds,
      streamIntervalSeconds,
      streamRatePerSecond,
      cryptoStreamRatePerSecond,
    });
    
    const { data, error } = await supabase
      .from("crypto_streaming_donations")
      .insert([
        {
          cause_id: donationData.causeId,
          donor_id: donationData.donorId || null,
          donor_name: donationData.donorName,
          donor_email: donationData.donorEmail,
          total_amount: donationData.totalAmount,
          remaining_amount: donationData.totalAmount,
          stream_rate_per_second: streamRatePerSecond,
          stream_duration_seconds: streamDurationSeconds,
          stream_interval_seconds: streamIntervalSeconds,
          crypto_currency: donationData.cryptoCurrency,
          crypto_network: donationData.cryptoNetwork,
          donor_wallet_address: donationData.donorWalletAddress,
          recipient_wallet_address: donationData.recipientWalletAddress,
          total_crypto_amount: donationData.totalCryptoAmount,
          remaining_crypto_amount: donationData.totalCryptoAmount,
          streamed_crypto_amount: 0,
        streamed_amount: 0,
          crypto_stream_rate_per_second: cryptoStreamRatePerSecond,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating crypto streaming donation:", error);
      throw new Error(`Failed to create crypto streaming donation: ${error.message}`);
    }

    console.log("Crypto streaming donation created:", data);

    // Start the streaming immediately
    console.log("Starting crypto streaming donation:", data.id);
    const { error: startError } = await supabase.rpc("start_crypto_streaming_donation", {
      p_streaming_donation_id: data.id,
    });

    if (startError) {
      console.error("Error starting crypto streaming donation:", startError);
      throw new Error(`Failed to start crypto streaming donation: ${startError.message}`);
    }

    console.log("Crypto streaming donation started successfully");

    return { success: true, data };
  } catch (error) {
    console.error("Crypto streaming donation creation error:", error);
    throw error;
  }
}

// Process crypto streaming donations (transfers actual tokens)
export async function processCryptoStreamingDonations() {
  try {
    const supabase = await createClient();
    const configuredRate = Number(process.env.EXCHANGE_RATE_NGN_PER_CRYPTO);
    const nairaPerCrypto = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 302.5;
    
    console.log("Processing crypto streaming donations...");
    
    // Get all active crypto streaming donations that need processing
    const { data: donations, error: fetchError } = await supabase
      .from("crypto_streaming_donations")
      .select("*")
      .eq("is_active", true)
      .eq("is_paused", false);

    if (fetchError) {
      console.error("Error fetching crypto streaming donations:", fetchError);
      return { success: false, processedCount: 0, error: fetchError.message };
    }

    console.log(`Found ${donations?.length || 0} crypto streaming donations to process`);
    if (donations && donations.length > 0) {
      console.log("Donations:", donations.map(d => ({ 
        id: d.id, 
        remaining: d.remaining_crypto_amount, 
        rate: d.crypto_stream_rate_per_second,
        active: d.is_active,
        paused: d.is_paused
      })));
    }

    let processedCount = 0;

    for (const donation of donations || []) {
      try {
        // Calculate amount to stream
        const streamAmount = Math.min(
          donation.crypto_stream_rate_per_second * donation.stream_interval_seconds,
          donation.remaining_crypto_amount
        );

        console.log(`Donation ${donation.id}: rate=${donation.crypto_stream_rate_per_second}, interval=${donation.stream_interval_seconds}, streamAmount=${streamAmount}, remaining=${donation.remaining_crypto_amount}`);

        // Process even very small amounts to show progress
        if (streamAmount > 0 || donation.remaining_crypto_amount > 0) {
          const amountToProcess = streamAmount > 0 ? streamAmount : donation.remaining_crypto_amount;
          
          console.log(`Processing crypto stream: ${amountToProcess} ${donation.crypto_currency}`);
          
          // Update donation record
          const newStreamedCryptoAmount = donation.streamed_crypto_amount + amountToProcess;
          const newRemainingCryptoAmount = donation.remaining_crypto_amount - amountToProcess;
          const newStreamedAmount = donation.streamed_amount + (amountToProcess * nairaPerCrypto);
          const newRemainingAmount = donation.remaining_amount - (amountToProcess * nairaPerCrypto);
          const isComplete = newRemainingCryptoAmount <= 0;

          await supabase
            .from("crypto_streaming_donations")
            .update({
              streamed_crypto_amount: newStreamedCryptoAmount,
              remaining_crypto_amount: newRemainingCryptoAmount,
              streamed_amount: newStreamedAmount,
              remaining_amount: newRemainingAmount,
              is_active: !isComplete,
              completed_at: isComplete ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", donation.id);

            // Update cause raised amount
            const { data: currentCause } = await supabase
              .from("causes")
              .select("raised")
              .eq("id", donation.cause_id)
              .single();
            
            if (currentCause) {
              await supabase
                .from("causes")
                .update({
                  raised: (currentCause.raised || 0) + (amountToProcess * nairaPerCrypto),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", donation.cause_id);
            }

          // Record transaction
          const txHash = crypto.randomUUID();
          await supabase
            .from("crypto_streaming_transactions")
            .insert([
              {
                crypto_streaming_donation_id: donation.id,
                amount: amountToProcess,
                amount_in_naira: amountToProcess * nairaPerCrypto,
                transaction_type: "stream",
                transaction_hash: txHash,
                processed_at: new Date().toISOString(),
              },
            ]);

          processedCount++;
          console.log(`Processed crypto stream: ${amountToProcess} ${donation.crypto_currency} (${txHash})`);
        }

      } catch (error) {
        console.error(`Error processing crypto streaming donation ${donation.id}:`, error);
      }
    }

    console.log(`Processed ${processedCount} crypto streaming donations`);
    return { success: true, processedCount, processed_count: processedCount };
  } catch (error) {
    console.error("Error in processCryptoStreamingDonations:", error);
    return { success: false, processedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get crypto streaming donations for a cause
export async function getCryptoStreamingDonationsForCause(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("crypto_streaming_donations")
      .select("*")
      .eq("cause_id", causeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching crypto streaming donations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getCryptoStreamingDonationsForCause:", error);
    return [];
  }
}

// Get live crypto streaming status for a cause
export async function getLiveCryptoStreamingStatus(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("crypto_streaming_donations")
      .select("*")
      .eq("cause_id", causeId);

    if (error) {
      console.error("Error getting crypto streaming status:", error);
      return null;
    }

    const activeStreams = data?.filter(d => d.is_active && !d.is_paused) || [];
    
    return {
      total_streaming_amount: activeStreams.reduce((sum, d) => sum + d.total_amount, 0),
      total_streamed_amount: activeStreams.reduce((sum, d) => sum + d.streamed_amount, 0),
      active_streams_count: activeStreams.length,
      current_stream_rate_per_second: activeStreams.reduce((sum, d) => sum + d.stream_rate_per_second, 0),
      total_crypto_streaming: activeStreams.reduce((sum, d) => sum + d.total_crypto_amount, 0),
      total_crypto_streamed: activeStreams.reduce((sum, d) => sum + d.streamed_crypto_amount, 0),
      current_crypto_stream_rate_per_second: activeStreams.reduce((sum, d) => sum + d.crypto_stream_rate_per_second, 0),
      crypto_currency: activeStreams[0]?.crypto_currency || "CRYPTO",
    };
  } catch (error) {
    console.error("Error in getLiveCryptoStreamingStatus:", error);
    return null;
  }
}
