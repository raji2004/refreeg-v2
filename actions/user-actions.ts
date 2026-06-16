"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/actions/role-actions";
import { logAdminActivity } from "@/actions/database-actions";

export async function blockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  const currentUserRole = await getUserRole(session.user.id);
  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    console.error("Unauthorized: Insufficient permissions to block user");
    return false;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: true,
        updatedAt: new Date(),
      },
    });

    await logAdminActivity("block-user", session.user.id as string);
    revalidatePath("/dashboard/admin/users");
    return true;
  } catch (error) {
    console.error("Error blocking user:", error);
    return false;
  }
}

export async function unblockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  const currentUserRole = await getUserRole(session.user.id);
  if (currentUserRole !== "admin" && currentUserRole !== "manager") {
    console.error("Unauthorized: Insufficient permissions to unblock user");
    return false;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: false,
        updatedAt: new Date(),
      },
    });

    await logAdminActivity("unblock-user", session.user.id as string);
    revalidatePath("/dashboard/admin/users");
    return true;
  } catch (error) {
    console.error("Error unblocking user:", error);
    return false;
  }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBlocked: true },
    });
    return user?.isBlocked || false;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
}

export async function deleteUserAccount(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    if (session.user.id !== userId) {
      return { error: "You can only delete your own account" };
    }

    // 1. Delete KYC verifications via Prisma
    await prisma.kyc_verifications.deleteMany({
      where: { user_id: userId },
    });

    // 2. Delete User via Prisma (Cascades to Roles, Accounts, Sessions)
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/dashboard/settings");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}

export async function deleteUserAsAdmin(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const currentUserRole = await getUserRole(session.user.id as string);
    if (currentUserRole !== "admin" && currentUserRole !== "manager") {
      return {
        error: "Unauthorized: Only admins and managers can delete users",
      };
    }

    // 1. Delete KYC verifications via Prisma
    await prisma.kyc_verifications.deleteMany({
      where: { user_id: userId },
    });

    // 2. Delete User via Prisma (Cascades to Roles, Accounts, Sessions)
    await prisma.user.delete({
      where: { id: userId },
    });

    await logAdminActivity("delete-user", session.user.id as string);

    revalidatePath("/dashboard/admin/users");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteUserAsAdmin:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}
