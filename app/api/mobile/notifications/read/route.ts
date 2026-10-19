import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { markNotificationsAsRead } from "@/lib/notifications/notification-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const { id, markAll } = body;

    const success = await markNotificationsAsRead(
      user!.id,
      id,
      Boolean(markAll),
    );
    return apiSuccess({ success });
  } catch (error: any) {
    console.error("Mobile API Mark Notifications Read Error:", error);
    return apiError("Internal server error", 500);
  }
}
