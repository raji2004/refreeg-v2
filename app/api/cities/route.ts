import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateName = searchParams.get("stateName")?.trim();

    if (!stateName) {
      return NextResponse.json(
        { error: "State name is required" },
        { status: 400 },
      );
    }

    const cities = await prisma.city.findMany({
      where: {
        state_name: { equals: stateName, mode: "insensitive" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(cities.map((c) => c.name));
  } catch (error) {
    console.error("Cities API error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
