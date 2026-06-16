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

    // 1. Fetch country and its states in a single query
    const country = await prisma.country.findFirst({
      where: {
        name: { equals: countryName, mode: "insensitive" },
      },
      select: {
        states: {
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(country.states.map((s) => s.name));
  } catch (error) {
    console.error("States API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}