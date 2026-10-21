import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { checkUsernameAvailability } from "@/actions/profile-actions";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";

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

    // Try extracting authenticated user so the user's current username is not marked as taken
    let currentUserId: string | undefined = undefined;
    try {
      const { user } = await authenticateMobileRequest(request);
      if (user?.id) currentUserId = user.id;
    } catch (_) {}

    const isAvailable = await checkUsernameAvailability(
      username,
      currentUserId,
    );

    return apiSuccess({
      username,
      isAvailable,
      available: isAvailable,
    });
  } catch (error: any) {
    console.error("Mobile API Check Username Error:", error);
    return apiError("Internal server error", 500);
  }
}
