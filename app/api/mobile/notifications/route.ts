import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getNotifications } from "@/lib/notifications/notification-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 50);
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

    const result = await getNotifications(user!.id, limit, offset);
    return apiSuccess(result);
  } catch (error: any) {
    console.error("Mobile API Get Notifications Error:", error);
    return apiError("Internal server error", 500);
  }
}
