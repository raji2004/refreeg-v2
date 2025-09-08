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

    // Validate and coerce numeric fields
    const numericFields = {
      totalAmount: Number(totalAmount),
      totalCryptoAmount: Number(totalCryptoAmount),
      streamDurationDays: Number(streamDurationDays),
      streamIntervalSeconds: Number(streamIntervalSeconds)
    };
    
    // Check for invalid numeric values
    for (const [field, value] of Object.entries(numericFields)) {
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid ${field}: must be a positive number` 
        }, { status: 400 });
      }
    }
    
    // Validate stream interval is not longer than duration
    if (numericFields.streamIntervalSeconds > numericFields.streamDurationDays * 86400) {
      return NextResponse.json({ 
        success: false, 
        error: "Stream interval cannot be longer than stream duration" 
      }, { status: 400 });
    }
    
    // Validate required string fields
    if (!causeId || !donorName || !donorEmail || !cryptoCurrency || 
        !cryptoNetwork || !donorWalletAddress || !recipientWalletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get authenticated user for server-side validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Use server-derived donor information
    const serverDonorId = user.id;
    const serverDonorEmail = user.email || donorEmail;

    // Calculate streaming parameters using validated numeric values
    const totalStreamingAmount = numericFields.totalAmount;
    const streamDurationSeconds = numericFields.streamDurationDays * 24 * 60 * 60;
    const streamRatePerSecond = numericFields.totalAmount / streamDurationSeconds;
    const cryptoStreamRatePerSecond = numericFields.totalCryptoAmount / streamDurationSeconds;
    const remainingAmount = numericFields.totalAmount;
    const remainingCryptoAmount = numericFields.totalCryptoAmount;

    // Create crypto streaming donation
    const { data, error } = await supabase
      .from('crypto_streaming_donations')
      .insert([
        {
          cause_id: causeId,
          donor_id: serverDonorId,
          donor_name: donorName,
          donor_email: serverDonorEmail,
          total_amount: numericFields.totalAmount,
          streamed_amount: 0,
          remaining_amount: remainingAmount,
          stream_duration_seconds: streamDurationSeconds,
          stream_rate_per_second: streamRatePerSecond,
          stream_interval_seconds: numericFields.streamIntervalSeconds,
          crypto_currency: cryptoCurrency,
          crypto_network: cryptoNetwork,
          total_crypto_amount: numericFields.totalCryptoAmount,
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
