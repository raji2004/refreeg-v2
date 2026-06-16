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

export async function listUsersWithRoles(): Promise<UserWithRole[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const currentUserRole = await getUserRole(session.user.id);

  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    throw new Error("Only admins or managers can list users");
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      isBlocked: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all roles separately
  const allRoles = await prisma.role.findMany({
    select: {
      user_id: true,
      role: true,
    },
  });

  const roleMap = new Map<string, string>();
  for (const role of allRoles) {
    roleMap.set(role.user_id, role.role);
  }

  const userIds = users.map((u) => u.id);
  const allKyc = await prisma.kyc_verifications.findMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
    select: {
      user_id: true,
      status: true,
      id: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const kycMap = new Map<string, { status: string; id: string }>();
  for (const kyc of allKyc) {
    if (!kycMap.has(kyc.user_id)) {
      kycMap.set(kyc.user_id, {
        status: kyc.status,
        id: kyc.id,
      });
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
