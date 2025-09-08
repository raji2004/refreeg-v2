import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Try to execute a simple SQL query to test what's available
    const { data, error } = await supabase
      .from("petition_signatures")
      .select("count")
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "petition_signatures table is accessible",
      currentColumns: data ? Object.keys(data[0] || {}) : []
    });
  } catch (error) {
    console.error("Error testing petition_signatures table:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
