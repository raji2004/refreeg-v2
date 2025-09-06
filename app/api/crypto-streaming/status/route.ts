import { getLiveCryptoStreamingStatus } from "@/actions/crypto-streaming-actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const causeId = searchParams.get("causeId");

    if (!causeId) {
      return NextResponse.json({ error: "Cause ID is required" }, { status: 400 });
    }

    const status = await getLiveCryptoStreamingStatus(causeId);
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Error getting crypto streaming status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
