import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { checkUsernameAvailability } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    
    if (!username) {
      return apiError("Username parameter is required", 400);
    }

    const isAvailable = await checkUsernameAvailability(username);
    
    return apiSuccess({
      username,
      isAvailable
    });
  } catch (error: any) {
    console.error("Mobile API Check Username Error:", error);
    return apiError("Internal server error", 500);
  }
}
