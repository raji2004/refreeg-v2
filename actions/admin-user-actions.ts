// actions/admin-user-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    console.error("Unauthorized: User is not admin or manager");
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: true,
      updatedAt: new Date(),
    },
  });

  // Log the activity
  await prisma.logs.create({
    data: {
      action: "block-user",
      admin_id: session.user.id,
      created_at: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/users");
  return true;
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("Unauthorized: No user found");
    return false;
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    console.error("Unauthorized: User is not admin or manager");
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: false,
      updatedAt: new Date(),
    },
  });

  await prisma.logs.create({
    data: {
      action: "unblock-user",
      admin_id: session.user.id,
      created_at: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/users");
  return true;
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBlocked: true },
  });

  return user?.isBlocked || false;
}

/**
 * Delete a user account (admin version)
 */
export async function deleteUserAsAdmin(
  userId: string,
): Promise<{ error: string | null }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const userRole = await getUserRole(session.user.id);
  if (userRole !== "admin" && userRole !== "manager") {
    return { error: "Unauthorized: Only admins and managers can delete users" };
  }

  try {
    // Delete in correct order due to foreign key constraints
    // 1. Delete KYC verifications
    await prisma.kyc_verifications.deleteMany({
      where: { user_id: userId },
    });

    // 2. Delete user roles
    await prisma.role.deleteMany({
      where: { user_id: userId },
    });

    // 3. Delete user wallet
    await prisma.userWallet.deleteMany({
      where: { userId },
    });

    // 4. Delete user streaks
    await prisma.userStreak.deleteMany({
      where: { userId },
    });

    // 5. Delete reward transactions
    await prisma.rewardTransaction.deleteMany({
      where: { userId },
    });

    // 6. Delete sessions and accounts
    await prisma.session.deleteMany({
      where: { userId },
    });
    await prisma.account.deleteMany({
      where: { userId },
    });

    // 7. Finally delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the activity
    await prisma.logs.create({
      data: {
        action: "delete-user",
        admin_id: session.user.id,
        created_at: new Date(),
      },
    });

    revalidatePath("/dashboard/admin/users");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteUserAsAdmin:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

/**
 * Get user details for admin
 */
export async function getUserDetailsForAdmin(userId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      phone: true,
      profilePhoto: true,
      isBlocked: true,
      isVerified: true,
      createdAt: true,
      total_points: true,
      current_tier: true,
      roles: {
        select: { role: true },
      },

      causes: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          raised: true,
          goal: true,
          createdAt: true,
        },
      },
      donations: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          cause: {
            select: { title: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  const kyc = await prisma.kyc_verifications.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      document_type: true,
      created_at: true,
    },
  });

  return {
    ...user,
    kyc_verifications: kyc ? [kyc] : [],
  };
}
