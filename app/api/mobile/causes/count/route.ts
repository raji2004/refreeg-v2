import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { countCauses } from "@/actions/cause-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const options: any = {
      category,
      status,
      search,
    };

    const total = await countCauses(options);
    
    return apiSuccess({ count: total });
  } catch (error: any) {
    console.error("Mobile API Count Causes Error:", error);
    return apiError("Internal server error", 500);
  }
}
