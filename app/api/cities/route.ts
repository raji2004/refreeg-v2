import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateName = searchParams.get("stateName")?.trim();

    if (!stateName) {
      return NextResponse.json(
        { error: "State name is required" },
        { status: 400 }
      );
    }

    // 1. Fetch the state and its cities in a single query
    const state = await prisma.state.findFirst({
      where: {
        name: { equals: stateName, mode: "insensitive" },
      },
      select: {
        cities: {
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!state) {
      return NextResponse.json(
        { error: "State not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(state.cities.map((c) => c.name));
  } catch (error) {
    console.error("Cities API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}