import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      causeId,
      donorId,
      donorName,
      donorEmail,
      totalAmount,
      streamDurationDays,
      streamIntervalSeconds,
      cryptoCurrency,
      cryptoNetwork,
      donorWalletAddress,
      recipientWalletAddress,
      totalCryptoAmount
    } = body;

    // Validate required fields
    if (!causeId || !donorId || !donorName || !donorEmail || !totalAmount || 
        !streamDurationDays || !streamIntervalSeconds || !cryptoCurrency || 
        !cryptoNetwork || !donorWalletAddress || !recipientWalletAddress || 
        !totalCryptoAmount) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Calculate streaming parameters
    const totalStreamingAmount = totalAmount;
    const streamDurationSeconds = streamDurationDays * 24 * 60 * 60;
    const streamRatePerSecond = totalAmount / streamDurationSeconds;
    const cryptoStreamRatePerSecond = totalCryptoAmount / streamDurationSeconds;
    const remainingAmount = totalAmount;
    const remainingCryptoAmount = totalCryptoAmount;

    // Create crypto streaming donation
    const { data, error } = await supabase
      .from('crypto_streaming_donations')
      .insert([
        {
          cause_id: causeId,
          donor_id: donorId,
          donor_name: donorName,
          donor_email: donorEmail,
          total_amount: totalStreamingAmount,
          streamed_amount: 0,
          remaining_amount: remainingAmount,
          stream_duration_seconds: streamDurationSeconds,
          stream_rate_per_second: streamRatePerSecond,
          stream_interval_seconds: streamIntervalSeconds,
          crypto_currency: cryptoCurrency,
          crypto_network: cryptoNetwork,
          total_crypto_amount: totalCryptoAmount,
          streamed_crypto_amount: 0,
          remaining_crypto_amount: remainingCryptoAmount,
          crypto_stream_rate_per_second: cryptoStreamRatePerSecond,
          donor_wallet_address: donorWalletAddress,
          recipient_wallet_address: recipientWalletAddress,
          is_active: true,
          is_paused: false,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating crypto streaming donation:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log('Crypto streaming donation created:', data);
    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    console.error('Error in crypto streaming create endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
