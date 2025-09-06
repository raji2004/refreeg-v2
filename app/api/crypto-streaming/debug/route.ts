import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all crypto streaming donations
    const { data: donations, error } = await supabase
      .from("crypto_streaming_donations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: donations?.length || 0,
      donations: donations?.map(d => ({
        id: d.id,
        cause_id: d.cause_id,
        is_active: d.is_active,
        is_paused: d.is_paused,
        remaining_crypto_amount: d.remaining_crypto_amount,
        crypto_stream_rate_per_second: d.crypto_stream_rate_per_second,
        stream_interval_seconds: d.stream_interval_seconds,
        crypto_currency: d.crypto_currency,
        crypto_network: d.crypto_network
      })) || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
