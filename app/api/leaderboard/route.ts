import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/actions/leaderboard-actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const data = await getLeaderboard({ page, pageSize });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=25, stale-while-revalidate=59",
      },
    });
  } catch (error: any) {
    console.error("[API] /api/leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 },
    );
  }
}
