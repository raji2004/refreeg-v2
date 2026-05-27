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

    if (!countryCode) {
      return apiError("Missing countryCode parameter", 400);
    }

    const statesData = await prisma.state.findMany({
      where: { country_code: { equals: countryCode, mode: "insensitive" } },
      orderBy: { name: "asc" }
    });

    const states = statesData.map((s: any) => ({
      name: s.name,
      code: s.state_code,
    }));

    return apiSuccess(states);
  } catch (error: any) {
    console.error("Mobile API Get States Error:", error);
    return apiError("Internal server error", 500);
  }
}
