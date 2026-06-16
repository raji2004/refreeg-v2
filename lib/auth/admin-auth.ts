import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export type UserRole = "admin" | "manager" | "user";

export async function getUserRole(userId: string): Promise<UserRole> {
  const role = await prisma.role.findFirst({
    where: { user_id: userId },
    select: { role: true },
  });

  return (role?.role as UserRole) || "user";
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "admin";
}

export async function isManager(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "manager" || role === "admin";
}

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const role = await getUserRole(session.user.id);

  if (role !== "admin") {
    throw new Error("Admin access required");
  }

  return session.user;
}

export async function requireAdminOrManager() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const role = await getUserRole(session.user.id);

  if (role !== "admin" && role !== "manager") {
    throw new Error("Admin or manager access required");
  }

  return session.user;
}
