"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/lib/auth/admin-auth";
import { UserWithRole } from "@/types";
export { getUserRole };

export type UserRole = "admin" | "manager" | "user";

export async function getUserRoleInfo(userId: string): Promise<{
  isAdmin: boolean;
  isManager: boolean;
  role: UserRole;
}> {
  const role = await getUserRole(userId);
  return {
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
    role,
  };
}

export async function isAdminOrManager(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin" || role === "manager";
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("No authenticated user");
    return false;
  }

  const currentUserRole = await getUserRole(session.user.id);

  if (currentUserRole !== "admin") {
    console.error("Only admins can set roles");
    return false;
  }

  const existingRole = await prisma.role.findFirst({
    where: { user_id: userId },
  });

  if (existingRole) {
    await prisma.role.update({
      where: { id: existingRole.id },
      data: {
        role,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.role.create({
      data: {
        user_id: userId,
        role,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  await prisma.logs.create({
    data: {
      action:
        role === "manager"
          ? "appoint-manager"
          : role === "admin"
            ? "appoint-admin"
            : "remove-manager",
      admin_id: session.user.id,
      created_at: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/users");
  return true;
}

async function requireAdminOrManagerForUsers() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const currentUserRole = await getUserRole(session.user.id);

  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    throw new Error("Only admins or managers can list users");
  }
}

function userSearchWhere(search?: string) {
  const query = search?.trim();
  if (!query) return {};

  return {
    OR: [
      { email: { contains: query, mode: "insensitive" as const } },
      { fullName: { contains: query, mode: "insensitive" as const } },
    ],
  };
}

const USER_LIST_SELECT = {
  id: true,
  email: true,
  fullName: true,
  username: true,
  isBlocked: true,
  createdAt: true,
} as const;

const USER_LIST_ORDER = [{ createdAt: "desc" }, { id: "desc" }] as const;

async function attachRolesAndKyc(
  users: {
    id: string;
    email: string | null;
    fullName: string | null;
    username: string | null;
    isBlocked: boolean | null;
    createdAt: Date;
  }[],
): Promise<UserWithRole[]> {
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  const [roles, kycRecords] = await Promise.all([
    prisma.role.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, role: true },
    }),
    prisma.kyc_verifications.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, status: true, id: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const roleMap = new Map<string, string>();
  for (const role of roles) {
    roleMap.set(role.user_id, role.role);
  }

  const kycMap = new Map<string, { status: string; id: string }>();
  for (const kyc of kycRecords) {
    if (!kycMap.has(kyc.user_id)) {
      kycMap.set(kyc.user_id, { status: kyc.status, id: kyc.id });
    }
  }

  return users.map((user) => {
    const kyc = kycMap.get(user.id);
    return {
      id: user.id,
      email: user.email || "",
      role: (roleMap.get(user.id) as UserRole) || "user",
      is_blocked: user.isBlocked || false,
      full_name: user.fullName,
      username: user.username,
      created_at: user.createdAt.toISOString(),
      kyc_status: (kyc?.status as UserWithRole["kyc_status"]) || null,
      kyc_verification_id: kyc?.id || null,
    };
  });
}

export interface UsersWithRolesPage {
  users: UserWithRole[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listUsersWithRolesPage({
  page = 1,
  pageSize = 25,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}): Promise<UsersWithRolesPage> {
  await requireAdminOrManagerForUsers();

  const safePageSize = Math.min(Math.max(Math.floor(pageSize) || 25, 1), 100);
  const safePage = Math.max(Math.floor(page) || 1, 1);
  const where = userSearchWhere(search);

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_LIST_SELECT,
      orderBy: [...USER_LIST_ORDER],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: await attachRolesAndKyc(rows),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(Math.ceil(total / safePageSize), 1),
  };
}

// Users whose most recent KYC submission is still pending, used for the
// "needs review" banner so it counts everyone, not just the visible page.
export async function getPendingKycSummary(
  search?: string,
): Promise<{ count: number; firstUserId: string | null }> {
  await requireAdminOrManagerForUsers();

  const pending = await prisma.kyc_verifications.findMany({
    where: { status: "pending" },
    select: { user_id: true, created_at: true },
  });

  const latestPending = new Map<string, number>();
  for (const row of pending) {
    const time = row.created_at?.getTime() ?? 0;
    if (
      !latestPending.has(row.user_id) ||
      time > latestPending.get(row.user_id)!
    ) {
      latestPending.set(row.user_id, time);
    }
  }
  if (latestPending.size === 0) return { count: 0, firstUserId: null };

  const latestOverall = await prisma.kyc_verifications.groupBy({
    by: ["user_id"],
    where: { user_id: { in: [...latestPending.keys()] } },
    _max: { created_at: true },
  });

  const stillPending = latestOverall
    .filter(
      (row) =>
        (row._max.created_at?.getTime() ?? 0) <=
        (latestPending.get(row.user_id) ?? 0),
    )
    .map((row) => row.user_id);
  if (stillPending.length === 0) return { count: 0, firstUserId: null };

  const matching = await prisma.user.findMany({
    where: { id: { in: stillPending }, ...userSearchWhere(search) },
    select: { id: true },
    orderBy: [...USER_LIST_ORDER],
  });

  return { count: matching.length, firstUserId: matching[0]?.id ?? null };
}

const USER_EXPORT_BATCH_SIZE = 500;

// Full listing for exports. Walks the table in bounded batches so no single
// query carries every user id.
export async function listUsersWithRoles(): Promise<UserWithRole[]> {
  await requireAdminOrManagerForUsers();

  const all: UserWithRole[] = [];

  for (let skip = 0; ; skip += USER_EXPORT_BATCH_SIZE) {
    const rows = await prisma.user.findMany({
      select: USER_LIST_SELECT,
      orderBy: [...USER_LIST_ORDER],
      skip,
      take: USER_EXPORT_BATCH_SIZE,
    });

    all.push(...(await attachRolesAndKyc(rows)));

    if (rows.length < USER_EXPORT_BATCH_SIZE) break;
  }

  return all;
}

export async function getAllUsers() {
  return await listUsersWithRoles();
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.role.findMany({
    where: { role: "admin" },
    select: { user_id: true },
  });

  if (admins.length === 0) return [];

  const userIds = admins.map((a) => a.user_id);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { email: true },
  });

  return users.map((u) => u.email).filter((email): email is string => !!email);
}

export async function ensureDefaultAdmin(): Promise<void> {
  const DEFAULT_ADMIN_EMAIL = "kingraj1344@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (user) {
    const existingRole = await prisma.role.findFirst({
      where: { user_id: user.id, role: "admin" },
    });

    if (!existingRole) {
      await setUserRole(user.id, "admin");
    }
  }
}
