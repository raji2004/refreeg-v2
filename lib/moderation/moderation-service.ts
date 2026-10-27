import { prisma } from "@/lib/prisma";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";

export type ReportTargetType = "comment" | "cause" | "petition" | "user";
export type ReportStatus = "pending" | "actioned" | "dismissed";
export type ModerationAction = "dismiss" | "remove_content" | "block_user";

export interface ModerationReportItem {
  id: string;
  reporterId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetPreview: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  reportedUserEmail: string | null;
  reportedUserBlocked: boolean;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  dueAt: string;
  createdAt: string;
  isOverdue: boolean;
  hoursRemaining: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

let tablesInitialized = false;

/**
 * Ensures the `content_reports` and `user_blocks` tables exist in Postgres
 * even before `prisma db push` is run on the environment.
 */
export async function ensureModerationTablesExist(): Promise<void> {
  if (tablesInitialized) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.content_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NULL,
        target_type VARCHAR(32) NOT NULL,
        target_id VARCHAR(128) NOT NULL,
        reported_user_id UUID NULL,
        reason VARCHAR(255) NOT NULL,
        details TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        resolution_note TEXT NULL,
        reviewed_by UUID NULL,
        reviewed_at TIMESTAMPTZ(6) NULL,
        due_at TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + interval '48 hours'),
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_content_reports_status_due
      ON public.content_reports (status, due_at);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_content_reports_target
      ON public.content_reports (target_type, target_id);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.user_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_user_id UUID NOT NULL,
        blocked_user_id UUID NOT NULL,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_user_id, blocked_user_id)
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
      ON public.user_blocks (blocker_user_id);
    `);

    tablesInitialized = true;
  } catch (error) {
    console.error("[ModerationService] Failed to ensure tables exist:", error);
  }
}

async function resolveReportedUserId(
  targetType: ReportTargetType,
  targetId: string,
  explicitReportedUserId?: string | null
): Promise<string | null> {
  if (isValidUuid(explicitReportedUserId)) {
    return explicitReportedUserId.trim();
  }

  if (!isValidUuid(targetId)) {
    return null;
  }

  try {
    if (targetType === "user") {
      return targetId;
    }
    if (targetType === "comment") {
      const comment = await prisma.comments.findUnique({
        where: { id: targetId },
        select: { user_id: true },
      });
      return comment?.user_id ?? null;
    }
    if (targetType === "cause") {
      const cause = await prisma.causes.findUnique({
        where: { id: targetId },
        select: { user_id: true },
      });
      return cause?.user_id ?? null;
    }
    if (targetType === "petition") {
      const petition = await prisma.petitions.findUnique({
        where: { id: targetId },
        select: { user_id: true },
      });
      return petition?.user_id ?? null;
    }
  } catch {
    // Non-fatal lookup failure
  }
  return null;
}

export async function createContentReport(input: {
  reporterId?: string | null;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  reason: string;
  details?: string | null;
}): Promise<{ id: string; dueAt: Date; slaHours: number }> {
  await ensureModerationTablesExist();

  const slaHours = DATA_RETENTION_POLICY.MODERATION_SLA_HOURS;
  const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);
  const reporterUuid = isValidUuid(input.reporterId)
    ? input.reporterId.trim()
    : null;
  const resolvedReportedUserUuid = await resolveReportedUserId(
    input.targetType,
    input.targetId,
    input.reportedUserId
  );

  const rows = await prisma.$queryRaw<Array<{ id: string; due_at: Date }>>`
    INSERT INTO public.content_reports (
      reporter_id,
      target_type,
      target_id,
      reported_user_id,
      reason,
      details,
      status,
      due_at
    )
    VALUES (
      ${reporterUuid}::uuid,
      ${input.targetType},
      ${input.targetId.slice(0, 128)},
      ${resolvedReportedUserUuid}::uuid,
      ${input.reason.slice(0, 255)},
      ${input.details ?? null},
      'pending',
      ${dueAt}
    )
    RETURNING id, due_at
  `;

  return {
    id: rows[0]?.id ?? "",
    dueAt: rows[0]?.due_at ?? dueAt,
    slaHours,
  };
}

export async function blockUserForModeration(input: {
  blockerUserId: string;
  blockedUserId?: string | null;
  commentId?: string | null;
  reason?: string | null;
}): Promise<{ blockedUserId: string | null; reportId: string }> {
  await ensureModerationTablesExist();

  let targetUserId = isValidUuid(input.blockedUserId)
    ? input.blockedUserId.trim()
    : null;

  if (!targetUserId && isValidUuid(input.commentId)) {
    const comment = await prisma.comments.findUnique({
      where: { id: input.commentId.trim() },
      select: { user_id: true },
    });
    targetUserId = comment?.user_id ?? null;
  }

  if (
    targetUserId &&
    isValidUuid(input.blockerUserId) &&
    targetUserId !== input.blockerUserId
  ) {
    await prisma.$executeRaw`
      INSERT INTO public.user_blocks (blocker_user_id, blocked_user_id, reason)
      VALUES (
        ${input.blockerUserId}::uuid,
        ${targetUserId}::uuid,
        ${(input.reason ?? "Blocked by user in mobile app").slice(0, 255)}
      )
      ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
    `;
  }

  // Always notify the moderation queue when a user blocks someone so moderators
  // review the account/comment within the 48-hour SLA.
  const report = await createContentReport({
    reporterId: input.blockerUserId,
    targetType: input.commentId ? "comment" : "user",
    targetId: input.commentId || targetUserId || "unknown-user",
    reportedUserId: targetUserId,
    reason: input.reason || "User blocked author for abusive/objectionable content",
    details: "Auto-escalated to moderation queue when user blocked this account.",
  });

  return {
    blockedUserId: targetUserId,
    reportId: report.id,
  };
}

export async function unblockUserForModeration(input: {
  blockerUserId: string;
  blockedUserId: string;
}): Promise<void> {
  await ensureModerationTablesExist();
  if (!isValidUuid(input.blockerUserId) || !isValidUuid(input.blockedUserId)) {
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM public.user_blocks
    WHERE blocker_user_id = ${input.blockerUserId}::uuid
      AND blocked_user_id = ${input.blockedUserId}::uuid
  `;
}

export async function getBlockedUserIds(
  blockerUserId: string | null | undefined
): Promise<string[]> {
  if (!isValidUuid(blockerUserId)) return [];
  await ensureModerationTablesExist();

  try {
    const rows = await prisma.$queryRaw<Array<{ blocked_user_id: string }>>`
      SELECT blocked_user_id::text AS blocked_user_id
      FROM public.user_blocks
      WHERE blocker_user_id = ${blockerUserId}::uuid
    `;
    return rows.map((r) => r.blocked_user_id);
  } catch {
    return [];
  }
}

export async function listModerationReports(options?: {
  status?: string;
}): Promise<{
  reports: ModerationReportItem[];
  counts: { pending: number; actioned: number; dismissed: number; overdue: number };
}> {
  await ensureModerationTablesExist();

  const statusFilter =
    options?.status && ["pending", "actioned", "dismissed"].includes(options.status)
      ? options.status
      : null;

  const rawReports = await prisma.$queryRaw<
    Array<{
      id: string;
      reporter_id: string | null;
      reporter_name: string | null;
      reporter_email: string | null;
      target_type: string;
      target_id: string;
      reported_user_id: string | null;
      reported_name: string | null;
      reported_email: string | null;
      reported_blocked: boolean | null;
      reason: string;
      details: string | null;
      status: string;
      resolution_note: string | null;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      due_at: Date;
      created_at: Date;
    }>
  >`
    SELECT
      r.id::text AS id,
      r.reporter_id::text AS reporter_id,
      rep.full_name AS reporter_name,
      rep.email AS reporter_email,
      r.target_type,
      r.target_id,
      r.reported_user_id::text AS reported_user_id,
      target_u.full_name AS reported_name,
      target_u.email AS reported_email,
      target_u.is_blocked AS reported_blocked,
      r.reason,
      r.details,
      r.status,
      r.resolution_note,
      r.reviewed_by::text AS reviewed_by,
      r.reviewed_at,
      r.due_at,
      r.created_at
    FROM public.content_reports r
    LEFT JOIN public.profiles rep ON rep.id = r.reporter_id
    LEFT JOIN public.profiles target_u ON target_u.id = r.reported_user_id
    WHERE (${statusFilter}::text IS NULL OR r.status = ${statusFilter})
    ORDER BY
      CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END ASC,
      r.due_at ASC,
      r.created_at DESC
    LIMIT 200
  `;

  // Enrich with target previews (comment body, cause title, petition title)
  const commentIds = rawReports
    .filter((r) => r.target_type === "comment" && isValidUuid(r.target_id))
    .map((r) => r.target_id);
  const causeIds = rawReports
    .filter((r) => r.target_type === "cause" && isValidUuid(r.target_id))
    .map((r) => r.target_id);
  const petitionIds = rawReports
    .filter((r) => r.target_type === "petition" && isValidUuid(r.target_id))
    .map((r) => r.target_id);

  const [comments, causes, petitions] = await Promise.all([
    commentIds.length > 0
      ? prisma.comments.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, content: true },
        })
      : Promise.resolve([]),
    causeIds.length > 0
      ? prisma.causes.findMany({
          where: { id: { in: causeIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    petitionIds.length > 0
      ? prisma.petitions.findMany({
          where: { id: { in: petitionIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const previewMap = new Map<string, string>();
  for (const c of comments) previewMap.set(`comment:${c.id}`, c.content);
  for (const c of causes) previewMap.set(`cause:${c.id}`, c.title);
  for (const p of petitions) previewMap.set(`petition:${p.id}`, p.title);

  const nowMs = Date.now();
  const reports: ModerationReportItem[] = rawReports.map((r) => {
    const dueMs = new Date(r.due_at).getTime();
    const hoursRemaining = Math.round(((dueMs - nowMs) / (1000 * 60 * 60)) * 10) / 10;
    const isOverdue = r.status === "pending" && dueMs < nowMs;
    return {
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      reporterEmail: r.reporter_email,
      targetType: (r.target_type as ReportTargetType) || "comment",
      targetId: r.target_id,
      targetPreview:
        previewMap.get(`${r.target_type}:${r.target_id}`) ?? null,
      reportedUserId: r.reported_user_id,
      reportedUserName: r.reported_name,
      reportedUserEmail: r.reported_email,
      reportedUserBlocked: Boolean(r.reported_blocked),
      reason: r.reason,
      details: r.details,
      status: (r.status as ReportStatus) || "pending",
      resolutionNote: r.resolution_note,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      dueAt: new Date(r.due_at).toISOString(),
      createdAt: new Date(r.created_at).toISOString(),
      isOverdue,
      hoursRemaining,
    };
  });

  const countRows = await prisma.$queryRaw<
    Array<{
      pending: bigint;
      actioned: bigint;
      dismissed: bigint;
      overdue: bigint;
    }>
  >`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'actioned') AS actioned,
      COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed,
      COUNT(*) FILTER (WHERE status = 'pending' AND due_at < now()) AS overdue
    FROM public.content_reports
  `;

  const summary = countRows[0];
  return {
    reports,
    counts: {
      pending: Number(summary?.pending ?? 0),
      actioned: Number(summary?.actioned ?? 0),
      dismissed: Number(summary?.dismissed ?? 0),
      overdue: Number(summary?.overdue ?? 0),
    },
  };
}

export async function resolveModerationReport(input: {
  reportId: string;
  adminId: string;
  action: ModerationAction;
  resolutionNote?: string;
}): Promise<{ success: boolean; message: string }> {
  await ensureModerationTablesExist();

  if (!isValidUuid(input.reportId)) {
    return { success: false, message: "Invalid report ID." };
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      target_type: string;
      target_id: string;
      reported_user_id: string | null;
    }>
  >`
    SELECT
      id::text AS id,
      target_type,
      target_id,
      reported_user_id::text AS reported_user_id
    FROM public.content_reports
    WHERE id = ${input.reportId}::uuid
    LIMIT 1
  `;

  const report = rows[0];
  if (!report) {
    return { success: false, message: "Report not found." };
  }

  if (input.action === "remove_content" || input.action === "block_user") {
    if (report.target_type === "comment" && isValidUuid(report.target_id)) {
      await prisma.comments.deleteMany({
        where: {
          OR: [{ id: report.target_id }, { parent_id: report.target_id }],
        },
      });
    } else if (report.target_type === "cause" && isValidUuid(report.target_id)) {
      await prisma.causes.updateMany({
        where: { id: report.target_id },
        data: {
          paused: true,
          status: "rejected",
          rejection_reason:
            input.resolutionNote || "Removed following moderation review.",
        },
      });
    } else if (
      report.target_type === "petition" &&
      isValidUuid(report.target_id)
    ) {
      await prisma.petitions.updateMany({
        where: { id: report.target_id },
        data: {
          status: "rejected",
          rejection_reason:
            input.resolutionNote || "Removed following moderation review.",
        },
      });
    }
  }

  if (input.action === "block_user" && isValidUuid(report.reported_user_id)) {
    await prisma.profiles.updateMany({
      where: { id: report.reported_user_id },
      data: { is_blocked: true },
    });
  }

  const nextStatus: ReportStatus =
    input.action === "dismiss" ? "dismissed" : "actioned";
  const defaultNote =
    input.action === "dismiss"
      ? "Reviewed and dismissed by moderator."
      : input.action === "block_user"
      ? "Offending content removed and user account blocked."
      : "Offending content removed by moderator.";

  await prisma.$executeRaw`
    UPDATE public.content_reports
    SET
      status = ${nextStatus},
      resolution_note = ${input.resolutionNote || defaultNote},
      reviewed_by = ${isValidUuid(input.adminId) ? input.adminId : null}::uuid,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = ${input.reportId}::uuid
  `;

  return {
    success: true,
    message: defaultNote,
  };
}

