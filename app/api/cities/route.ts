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

    // 1. Fetch the cities directly
    const cities = await prisma.city.findMany({
      where: {
        state_name: { equals: stateName, mode: "insensitive" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    if (cities.length === 0) {
      return NextResponse.json(
        { error: "No cities found for state" },
        { status: 404 }
      );
    }

    return NextResponse.json(cities.map((c: any) => c.name));
  } catch (error) {
    console.error("Cities API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}