import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("countryCode");
    const stateCode = searchParams.get("stateCode");

    if (!countryCode || !stateCode) {
      return apiError("Missing countryCode or stateCode parameters", 400);
    }

    const citiesData = await prisma.city.findMany({
      where: { 
        country_code: { equals: countryCode, mode: "insensitive" },
        state_code: { equals: stateCode, mode: "insensitive" }
      },
      orderBy: { name: "asc" }
    });

    const cities = citiesData.map((c: any) => ({
      name: c.name,
    }));

    return apiSuccess(cities);
  } catch (error: any) {
    console.error("Mobile API Get Cities Error:", error);
    return apiError("Internal server error", 500);
  }
}
