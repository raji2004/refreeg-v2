import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Execute the SQL to fix the petition_signatures table
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Add missing columns to petition_signatures table
        ALTER TABLE public.petition_signatures 
        ADD COLUMN IF NOT EXISTS signer_address TEXT,
        ADD COLUMN IF NOT EXISTS token_id INTEGER,
        ADD COLUMN IF NOT EXISTS signature_message TEXT,
        ADD COLUMN IF NOT EXISTS tx_hash TEXT;

        -- Make signer_address NOT NULL after adding it
        ALTER TABLE public.petition_signatures 
        ALTER COLUMN signer_address SET NOT NULL;

        -- Add indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_petition_signatures_petition_id ON public.petition_signatures(petition_id);
        CREATE INDEX IF NOT EXISTS idx_petition_signatures_signer_address ON public.petition_signatures(signer_address);
        CREATE INDEX IF NOT EXISTS idx_petition_signatures_token_id ON public.petition_signatures(token_id);
      `
    });
    
    if (error) {
      console.error("Error fixing petition_signatures table:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    // Verify the table structure
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, ordinal_position")
      .eq("table_name", "petition_signatures")
      .eq("table_schema", "public")
      .order("ordinal_position", { ascending: true });
    
    if (columnsError) {
      console.error("Error verifying table structure:", columnsError);
      return NextResponse.json({
        success: false,
        error: "Failed to verify table structure",
        details: columnsError.message
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "petition_signatures table fixed successfully",
      columns: (columns || []).map((c: any) => c.column_name)
    });
  } catch (error) {
    console.error("Error fixing petition_signatures table:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
