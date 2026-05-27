import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const countriesData = await prisma.country.findMany({
      orderBy: { name: "asc" }
    });
    
    const countries = countriesData.map((c: any) => ({
      name: c.name,
      code: c.country,
      flag: "", // Not available in DB
      phonecode: "", // Not available in DB
    }));

    return apiSuccess(countries);
  } catch (error: any) {
    console.error("Mobile API Get Countries Error:", error);
    return apiError("Internal server error", 500);
  }
}
