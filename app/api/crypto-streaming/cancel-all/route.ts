import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get all active crypto streaming donations
    const { data: donations, error: fetchError } = await supabase
      .from('crypto_streaming_donations')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching donations:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    console.log(`Found ${donations.length} active streams to cancel`);

    let canceledCount = 0;
    const errors = [];

    // Cancel each stream
    for (const donation of donations) {
      const { error: updateError } = await supabase
        .from('crypto_streaming_donations')
        .update({
          is_active: false,
          is_paused: true,
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', donation.id);

      if (updateError) {
        console.error(`Error canceling stream ${donation.id}:`, updateError);
        errors.push(`Failed to cancel ${donation.id}: ${updateError.message}`);
      } else {
        canceledCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      canceledCount,
      totalFound: donations.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error canceling streams:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
