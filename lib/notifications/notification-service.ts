import { prisma } from "@/lib/prisma";

let tableEnsured = false;

export async function ensureNotificationsTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "data" JSONB,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications"("user_id", "is_read");
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "notifications"("user_id", "created_at" DESC);
    `);
    tableEnsured = true;
  } catch (error) {
    console.error("Failed to ensure notifications table:", error);
  }
}

export type NotificationType =
  | "donation_received"
  | "cause_created"
  | "cause_approved"
  | "cause_rejected"
  | "milestone_proof"
  | "petition_signed"
  | "comment_received"
  | "general";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  await ensureNotificationsTable();
  const { userId, title, message, type, data } = params;

  try {
    const dataJson = data ? JSON.stringify(data) : null;
    const result = await prisma.$queryRawUnsafe<any[]>(
      `
      INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "data", "is_read", "created_at", "updated_at")
      VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::jsonb, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING "id", "user_id" as "userId", "title", "message", "type", "data", "is_read" as "isRead", "created_at" as "createdAt"
      `,
      userId,
      title,
      message,
      type,
      dataJson,
    );
    const notif = result[0];
    if (notif) {
      try {
        const { eventBus } = await import("@/lib/event-bus");
        eventBus.emit("notification", {
          type: "notification",
          data: {
            ...notif,
            user_id: userId,
          },
        });
      } catch (busErr) {
        console.warn("Failed to emit notification to eventBus:", busErr);
      }
    }
    return notif;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getNotifications(userId: string, limit = 20, offset = 0) {
  await ensureNotificationsTable();
  try {
    const items = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        "id", 
        "user_id" as "userId", 
        "title", 
        "message", 
        "type", 
        "data", 
        "is_read" as "isRead", 
        "created_at" as "createdAt"
      FROM "notifications"
      WHERE "user_id" = $1::uuid
      ORDER BY "created_at" DESC
      LIMIT $2 OFFSET $3
      `,
      userId,
      limit,
      offset,
    );

    const countResult = await prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT count(*)::text as count FROM "notifications" WHERE "user_id" = $1::uuid`,
      userId,
    );

    const unreadResult = await prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT count(*)::text as count FROM "notifications" WHERE "user_id" = $1::uuid AND "is_read" = false`,
      userId,
    );

    const total = parseInt(countResult[0]?.count || "0", 10);
    const unreadCount = parseInt(unreadResult[0]?.count || "0", 10);

    return {
      items,
      total,
      unreadCount,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      items: [],
      total: 0,
      unreadCount: 0,
      limit,
      offset,
    };
  }
}

export async function markNotificationsAsRead(
  userId: string,
  notificationId?: string,
  markAll = false,
) {
  await ensureNotificationsTable();
  try {
    if (markAll) {
      await prisma.$executeRawUnsafe(
        `UPDATE "notifications" SET "is_read" = true, "updated_at" = CURRENT_TIMESTAMP WHERE "user_id" = $1::uuid AND "is_read" = false`,
        userId,
      );
    } else if (notificationId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "notifications" SET "is_read" = true, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = $1::uuid AND "user_id" = $2::uuid`,
        notificationId,
        userId,
      );
    }
    return true;
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return false;
  }
}
