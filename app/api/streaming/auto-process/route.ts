import { NextRequest, NextResponse } from "next/server";
import { processStreamingDonations } from "@/actions/streaming-donation-actions";

// This endpoint runs the streaming processing
export async function GET() {
  try {
    const result = await processStreamingDonations();
    
    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      timestamp: new Date().toISOString(),
      message: `Processed ${result.processedCount} streaming donations`
    });
  } catch (error) {
    console.error("Error processing streaming donations:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Also handle POST requests
export async function POST() {
  return GET();
}
