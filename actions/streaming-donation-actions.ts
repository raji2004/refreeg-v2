"use server";

import { createClient } from "@/lib/supabase/server";

export interface StreamingDonation {
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
}

export interface StreamingTransaction {
  id: string;
  streaming_donation_id: string;
  amount: number;
  transaction_type: 'stream' | 'pause' | 'resume' | 'cancel' | 'complete';
  processed_at: string;
  metadata?: any;
}

export interface LiveStreamingStatus {
  total_streaming_amount: number;
  total_streamed_amount: number;
  active_streams_count: number;
  current_stream_rate_per_second: number;
}

// Create a new streaming donation
export async function createStreamingDonation(donationData: {
  causeId: string;
  donorId?: string;
  donorName: string;
  donorEmail: string;
  totalAmount: number;
  streamDurationDays: number;
  streamIntervalSeconds?: number;
}) {
  try {
    const supabase = await createClient();
    
    // Calculate streaming parameters
    const streamDurationSeconds = donationData.streamDurationDays * 24 * 60 * 60;
    const streamIntervalSeconds = donationData.streamIntervalSeconds || 1;
    const streamRatePerSecond = donationData.totalAmount / streamDurationSeconds;
    
    console.log("Creating streaming donation with parameters:", {
      causeId: donationData.causeId,
      totalAmount: donationData.totalAmount,
      streamDurationDays: donationData.streamDurationDays,
      streamDurationSeconds,
      streamIntervalSeconds,
      streamRatePerSecond,
    });
    
    const { data, error } = await supabase
      .from("streaming_donations")
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
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating streaming donation:", error);
      throw new Error(`Failed to create streaming donation: ${error.message}`);
    }

    console.log("Streaming donation created:", data);

    // Start the streaming immediately
    console.log("Starting streaming donation:", data.id);
    const { error: startError } = await supabase.rpc("start_streaming_donation", {
      p_streaming_donation_id: data.id,
    });

    if (startError) {
      console.error("Error starting streaming donation:", startError);
      throw new Error(`Failed to start streaming donation: ${startError.message}`);
    }

    console.log("Streaming donation started successfully");

    return { success: true, data };
  } catch (error) {
    console.error("Streaming donation creation error:", error);
    throw error;
  }
}

// Get streaming donations for a cause
export async function getStreamingDonationsForCause(causeId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("streaming_donations")
      .select("*")
      .eq("cause_id", causeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching streaming donations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getStreamingDonationsForCause:", error);
    return [];
  }
}

// Get live streaming status for a cause
export async function getLiveStreamingStatus(causeId: string): Promise<LiveStreamingStatus | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc("get_live_streaming_status", {
      p_cause_id: causeId,
    });

    if (error) {
      console.error("Error getting live streaming status:", error);
      return null;
    }

    return data[0] || {
      total_streaming_amount: 0,
      total_streamed_amount: 0,
      active_streams_count: 0,
      current_stream_rate_per_second: 0,
    };
  } catch (error) {
    console.error("Error in getLiveStreamingStatus:", error);
    return null;
  }
}

// Pause a streaming donation
export async function pauseStreamingDonation(streamingDonationId: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.rpc("toggle_streaming_donation", {
      p_streaming_donation_id: streamingDonationId,
      p_action: "pause",
    });

    if (error) {
      console.error("Error pausing streaming donation:", error);
      throw new Error("Failed to pause streaming donation");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in pauseStreamingDonation:", error);
    throw error;
  }
}

// Resume a streaming donation
export async function resumeStreamingDonation(streamingDonationId: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.rpc("toggle_streaming_donation", {
      p_streaming_donation_id: streamingDonationId,
      p_action: "resume",
    });

    if (error) {
      console.error("Error resuming streaming donation:", error);
      throw new Error("Failed to resume streaming donation");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in resumeStreamingDonation:", error);
    throw error;
  }
}

// Cancel a streaming donation (refund remaining amount)
export async function cancelStreamingDonation(streamingDonationId: string) {
  try {
    const supabase = await createClient();
    
    // Get the donation details
    const { data: donation, error: fetchError } = await supabase
      .from("streaming_donations")
      .select("*")
      .eq("id", streamingDonationId)
      .single();

    if (fetchError || !donation) {
      throw new Error("Streaming donation not found");
    }

    // Update donation status
    const { error: updateError } = await supabase
      .from("streaming_donations")
      .update({
        is_active: false,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", streamingDonationId);

    if (updateError) {
      console.error("Error canceling streaming donation:", updateError);
      throw new Error("Failed to cancel streaming donation");
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from("streaming_transactions")
      .insert([
        {
          streaming_donation_id: streamingDonationId,
          amount: donation.remaining_amount,
          transaction_type: "cancel",
          processed_at: new Date().toISOString(),
        },
      ]);

    if (transactionError) {
      console.error("Error recording cancel transaction:", transactionError);
    }

    return { success: true, refundAmount: donation.remaining_amount };
  } catch (error) {
    console.error("Error in cancelStreamingDonation:", error);
    throw error;
  }
}

// Process streaming donations (to be called by a cron job)
export async function processStreamingDonations() {
  try {
    const supabase = await createClient();
    
    console.log("Processing streaming donations...");
    const { data, error } = await supabase.rpc("process_streaming_donations");

    if (error) {
      console.error("Error processing streaming donations:", error);
      return { success: false, processedCount: 0, error: error.message };
    }

    console.log(`Processed ${data || 0} streaming donations`);
    return { success: true, processedCount: data || 0 };
  } catch (error) {
    console.error("Error in processStreamingDonations:", error);
    return { success: false, processedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get streaming transactions for a donation
export async function getStreamingTransactions(streamingDonationId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("streaming_transactions")
      .select("*")
      .eq("streaming_donation_id", streamingDonationId)
      .order("processed_at", { ascending: false });

    if (error) {
      console.error("Error fetching streaming transactions:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getStreamingTransactions:", error);
    return [];
  }
}
