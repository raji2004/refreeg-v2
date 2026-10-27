import { NextRequest } from "next/server";
import {
  apiSuccess,
  apiError,
  handleCorsPreflight,
} from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  createContentReport,
  type ReportTargetType,
} from "@/lib/moderation/moderation-service";

const VALID_TARGET_TYPES: ReportTargetType[] = [
  "comment",
  "cause",
  "petition",
  "user",
];

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    let reporterId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const authResult = await authenticateMobileRequest(request);
      if (authResult.user) {
        reporterId = authResult.user.id;
      }
    }

    const body = await request.json().catch(() => ({}));
    const rawType = String(body.targetType || "comment")
      .trim()
      .toLowerCase() as ReportTargetType;
    const targetType: ReportTargetType = VALID_TARGET_TYPES.includes(rawType)
      ? rawType
      : "comment";
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "").trim();
    const details = body.details ? String(body.details).trim() : null;
    const reportedUserId = body.reportedUserId
      ? String(body.reportedUserId).trim()
      : null;

    if (!targetId) {
      return apiError("targetId is required", 400);
    }
    if (!reason) {
      return apiError("reason is required", 400);
    }

    const report = await createContentReport({
      reporterId,
      targetType,
      targetId,
      reportedUserId,
      reason,
      details,
    });

    return apiSuccess(
      {
        reportId: report.id,
        dueAt: report.dueAt.toISOString(),
        slaHours: report.slaHours,
        message: `Report submitted. A moderator will review this within ${report.slaHours} hours.`,
      },
      201
    );
  } catch (error) {
    console.error("[POST /api/mobile/reports] Error:", error);
    return apiError("Unable to submit report right now.", 500);
  }
}

