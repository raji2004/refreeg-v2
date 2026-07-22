import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ALL_COUNTRIES } from "@/utils/countryUtils";

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });

    if (!countries.length) {
      return NextResponse.json(ALL_COUNTRIES, {
        status: 200,
        headers: { "x-data-source": "static" },
      });
    }

    return NextResponse.json(countries.map((c) => c.name));
  } catch (error) {
    return NextResponse.json(ALL_COUNTRIES, {
      status: 200,
      headers: { "x-data-source": "fallback" },
    });
  }
}