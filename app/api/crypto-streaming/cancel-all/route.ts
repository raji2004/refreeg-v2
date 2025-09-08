import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Check for admin secret header
  const adminSecret = request.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_CANCEL_ALL_SECRET;
  
  if (!expectedSecret) {
    console.error('ADMIN_CANCEL_ALL_SECRET environment variable not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  if (!adminSecret) {
    console.warn('Unauthorized attempt to cancel all streams - missing secret header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Timing-safe comparison
  const isValidSecret = adminSecret.length === expectedSecret.length && 
    adminSecret.split('').every((char, i) => char === expectedSecret[i]);
    
  if (!isValidSecret) {
    console.warn('Unauthorized attempt to cancel all streams - invalid secret');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
