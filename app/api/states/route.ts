import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryName = searchParams.get("countryName")?.trim();

    if (!countryName) {
      return NextResponse.json(
        { error: "Country name is required" },
        { status: 400 },
      );
    }

    // The state table is empty in production; cities carries every state name.
    const states = await prisma.city.findMany({
      where: {
        country_name: { equals: countryName, mode: "insensitive" },
        state_name: { not: null },
      },
      distinct: ["state_name"],
      select: { state_name: true },
      orderBy: { state_name: "asc" },
    });

    return NextResponse.json(states.map((s) => s.state_name));
  } catch (error) {
    console.error("States API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
