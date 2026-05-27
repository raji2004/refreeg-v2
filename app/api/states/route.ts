import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryName = searchParams.get("countryName")?.trim();

    if (!countryName) {
      return NextResponse.json(
        { error: "Country name is required" },
        { status: 400 }
      );
    }

    // 1. Fetch states directly
    const states = await prisma.state.findMany({
      where: {
        country_name: { equals: countryName, mode: "insensitive" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    if (states.length === 0) {
      return NextResponse.json(
        { error: "No states found for country" },
        { status: 404 }
      );
    }

    return NextResponse.json(states.map((s: any) => s.name));
  } catch (error) {
    console.error("States API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}