import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/role-actions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  getDeviceTokensForBroadcast,
  getDeviceTokenStats,
} from "@/lib/notifications/device-token-service";
import { sendPushMulticast } from "@/lib/notifications/fcm-service";
import { createNotification } from "@/lib/notifications/notification-service";

/**
 * GET /api/admin/notifications/broadcast
 * Returns registered device stats for the admin push notification console.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const isAuthorized = await isAdminOrManager(session.user.id);
  if (!isAuthorized) {
    return apiError("Forbidden: Admin or Manager role required", 403);
  }

  const stats = await getDeviceTokenStats();
  return apiSuccess({ stats });
}

/**
 * POST /api/admin/notifications/broadcast
 * Sends marketing or operational push notification broadcast to mobile users.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const isAuthorized = await isAdminOrManager(session.user.id);
  if (!isAuthorized) {
    return apiError("Forbidden: Admin or Manager role required", 403);
  }

  try {
    const body = await request.json();
    const { title, message, audience = "all", imageUrl, url } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return apiError("Notification title is required", 400);
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return apiError("Notification message is required", 400);
    }

    const safeAudience =
      audience === "creators" || audience === "donors" ? audience : "all";

    const rows = await getDeviceTokensForBroadcast(safeAudience);
    if (!rows || rows.length === 0) {
      return apiSuccess({
        message: "No registered devices found for the selected audience.",
        targetedDevices: 0,
        sentCount: 0,
        failureCount: 0,
      });
    }

    const tokens = Array.from(new Set(rows.map((r) => r.token)));
    const uniqueUserIds = Array.from(new Set(rows.map((r) => r.userId)));

    // 1. Dispatch push notification to all target device tokens
    const pushResult = await sendPushMulticast({
      tokens,
      title: title.trim(),
      body: message.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      data: {
        type: "general",
        url: url?.trim() || "",
        sender: "admin_broadcast",
      },
    });

    // 2. Also record in the in-app notification center for these users (batch)
    // We do this asynchronously so it doesn't slow down the HTTP response
    (async () => {
      for (const uid of uniqueUserIds) {
        try {
          await createNotification({
            userId: uid,
            title: title.trim(),
            message: message.trim(),
            type: "general",
            data: {
              url: url?.trim() || "",
              sender: "admin_broadcast",
            },
          });
        } catch (e) {
          // ignore individual insertion failures
        }
      }
    })().catch((err) =>
      console.error("[Broadcast] In-app notification creation error:", err),
    );

    return apiSuccess({
      message: `Broadcast sent to ${tokens.length} device(s)`,
      targetedDevices: tokens.length,
      sentCount: pushResult.sentCount,
      failureCount: pushResult.failureCount,
      skipped: pushResult.skipped || false,
    });
  } catch (error: any) {
    console.error("Admin Push Broadcast Error:", error);
    return apiError(error?.message || "Internal server error", 500);
  }
}
