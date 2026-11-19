"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { ensureDefaultAdmin, isAdminOrManager } from "./role-actions";

export type Action =
  | "approve-cause"
  | "reject-cause"
  | "approve-petition"
  | "reject-petition"
  | "block-user"
  | "unblock-user"
  | "appoint-manager"
  | "remove-manager"
  | "delete-user"
  | "approve-kyc"
  | "reject-kyc"
  | "send-kyc-reminders"
  | "appoint-admin"
  | "takedown-api-campaign";

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    return result[0]?.exists ?? false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

export async function checkDatabaseSetup(): Promise<{
  ready: boolean;
  missingTables: string[];
}> {
  const requiredTables = ["profiles", "causes", "donations", "roles", "logs"];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (!exists) {
      missingTables.push(table);
    }
  }

  if (missingTables.length === 0 && typeof window === "undefined") {
    try {
      await ensureDefaultAdmin();
    } catch (error) {
      console.error("Error ensuring default admin:", error);
    }
  }

  return {
    ready: missingTables.length === 0,
    missingTables,
  };
}

export const logAdminActivity = async (action: Action, adminId: string) => {
  try {
    await prisma.logs.create({
      data: {
        action,
        admin_id: adminId,
        created_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Error logging admin activity:", error);
    // Don't throw - logging should not break the main action
  }
};

/**
 * Type for admin log entry (for the UI)
 */
export type AdminLogEntry = {
  id: string;
  action: string;
  admin_id: string | null;
  created_at: Date;
  admin_email: string;
  admin_name: string | null;
};

export async function listAdminLogs(limit: number = 200) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const logs = await prisma.logs.findMany({
    select: {
      id: true,
      action: true,
      admin_id: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  if (logs.length === 0) {
    return [];
  }

  const adminIds = [
    ...new Set(logs.map((log) => log.admin_id).filter(Boolean)),
  ] as string[];

  if (adminIds.length === 0) {
    return logs.map((log) => ({
      email: "Unknown User",
      action: log.action,
      created_at: log.created_at?.toISOString() || new Date().toISOString(),
    }));
  }

  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  const adminMap = new Map(
    admins.map((admin) => [
      admin.id,
      { email: admin.email || "Unknown User", name: admin.fullName },
    ]),
  );

  return logs.map((log) => ({
    email: log.admin_id
      ? (adminMap.get(log.admin_id)?.email ?? "Unknown User")
      : "System",
    action: log.action,
    created_at: log.created_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function getRecentAdminActions(limit: number = 10) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    return [];
  }

  const logs = await prisma.logs.findMany({
    select: {
      id: true,
      action: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  return logs;
}

export async function getAdminActionStats(days: number = 30) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await prisma.logs.groupBy({
    by: ["action"],
    where: {
      created_at: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
  });

  return stats.map((stat) => ({
    action: stat.action,
    count: stat._count.id,
  }));
}
