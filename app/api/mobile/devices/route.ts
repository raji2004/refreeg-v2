import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/lib/notifications/device-token-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * POST /api/mobile/devices
 * Register or update the push notification device token for the authenticated user.
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const { token, platform } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return apiError("Device token is required", 400);
    }

    const safePlatform =
      platform === "ios" || platform === "web" ? platform : "android";

    const success = await registerDeviceToken({
      userId: user!.id,
      token: token.trim(),
      platform: safePlatform,
    });

    return apiSuccess({ success });
  } catch (error: any) {
    console.error("Mobile API Device Token Registration Error:", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * DELETE /api/mobile/devices
 * Remove device token on user logout.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return apiError("Device token is required", 400);
    }

    const success = await unregisterDeviceToken(token.trim());
    return apiSuccess({ success });
  } catch (error: any) {
    console.error("Mobile API Device Token Deletion Error:", error);
    return apiError("Internal server error", 500);
  }
}
