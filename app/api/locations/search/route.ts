import { NextResponse } from "next/server";
import { searchCampaignLocations } from "@/lib/locations/campaign-location";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const suggestions = await searchCampaignLocations(query);
    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("Campaign location search failed:", error);
    return NextResponse.json(
      { error: "Unable to search locations" },
      { status: 500 },
    );
  }
}
