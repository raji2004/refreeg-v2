import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { countPetitions } from "@/actions/petition-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const options = {
      category,
      search,
    };

    const total = await countPetitions(options);
    
    return apiSuccess({ count: total });
  } catch (error: any) {
    console.error("Mobile API Count Petitions Error:", error);
    return apiError("Internal server error", 500);
  }
}
