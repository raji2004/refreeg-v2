import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleCorsPreflight,
} from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  blockUserForModeration,
  createContentReport,
  getBlockedUserIds,
  unblockUserForModeration,
} from "@/lib/moderation/moderation-service";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return apiSuccess({ blockedUserIds: [] });
    }
    const { user } = await authenticateMobileRequest(request);
    if (!user) {
      return apiSuccess({ blockedUserIds: [] });
    }
    const blockedUserIds = await getBlockedUserIds(user.id);
    return apiSuccess({ blockedUserIds });
  } catch (error) {
    console.error("[GET /api/mobile/users/block] Error:", error);
    return apiError("Failed to fetch blocked users.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const blockedUserId = body.blockedUserId
      ? String(body.blockedUserId).trim()
      : null;
    const commentId = body.commentId ? String(body.commentId).trim() : null;
    const reason = body.reason
      ? String(body.reason).trim()
      : "Blocked by user for objectionable content";

    if (!blockedUserId && !commentId) {
      return apiError("blockedUserId or commentId is required", 400);
    }

    let blockerUserId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.user) {
        blockerUserId = authResult.user.id;
      }
    }

    if (blockerUserId) {
      const result = await blockUserForModeration({
        blockerUserId,
        blockedUserId,
        commentId,
        reason,
      });

      return apiSuccess(
        {
          blockedUserId: result.blockedUserId,
          reportId: result.reportId,
          message:
            "User blocked. Their content is now hidden from your feed and our moderation team has been notified.",
        },
        201
      );
    }

    // Even if a guest blocks a comment author before signing in, escalate the report to moderators.
    const report = await createContentReport({
      reporterId: null,
      targetType: commentId ? "comment" : "user",
      targetId: commentId || blockedUserId || "unknown-user",
      reportedUserId: blockedUserId,
      reason,
      details: "Guest user blocked this author in mobile app.",
    });

    return apiSuccess(
      {
        blockedUserId,
        reportId: report.id,
        message:
          "User blocked on this device and reported to our moderation team.",
      },
      201
    );
  } catch (error) {
    console.error("[POST /api/mobile/users/block] Error:", error);
    return apiError("Unable to block user right now.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse || !user) return errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const blockedUserId = String(body.blockedUserId || "").trim();
    if (!blockedUserId) {
      return apiError("blockedUserId is required", 400);
    }

    await unblockUserForModeration({
      blockerUserId: user.id,
      blockedUserId,
    });

    return apiSuccess({
      blockedUserId,
      message: "User unblocked.",
    });
  } catch (error) {
    console.error("[DELETE /api/mobile/users/block] Error:", error);
    return apiError("Unable to unblock user right now.", 500);
  }
}

