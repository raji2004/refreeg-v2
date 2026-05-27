import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { getProfileByUsername } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    if (!username) {
      return apiError("Username is required", 400);
    }

    const profile = await getProfileByUsername(username);
    
    if (!profile) {
      return apiError("Profile not found", 404);
    }
    
    return apiSuccess(profile);
  } catch (error: any) {
    console.error("Mobile API Get Profile by Username Error:", error);
    return apiError("Internal server error", 500);
  }
}
