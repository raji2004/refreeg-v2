import { NextRequest, NextResponse } from "next/server";
import { processCryptoStreamingDonations } from "@/actions/crypto-streaming-actions";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processCryptoStreamingDonations();
    
    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing crypto streaming donations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET() {
  try {
    const result = await processCryptoStreamingDonations();
    
    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing crypto streaming donations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
