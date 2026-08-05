"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";
import { sendCauseRejectedEmailForUser } from "@/services/mail";

export type CauseStatus = "pending" | "approved" | "rejected" | "expired";

type AdminCauseRow = {
  id: string;
  title: string;
  category: string;
  goal: number;
  raised: number;
  status: string | null;
  rejectionReason: string | null;
  image: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    profile_photo: string | null;
  };
};

/**
 * List causes for admin with filters
 */
export async function listAdminCauses(
  status?: CauseStatus,
): Promise<AdminCauseRow[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  let sqlQuery = `
    SELECT 
      c.id,
      c.title,
      c.category,
      c.goal,
      c.raised,
      c.status,
      c.rejection_reason as "rejectionReason",
      c.image,
      c.created_at as "created_at",
      c.updated_at as "updated_at",
      c.user_id,
      p.full_name as "full_name",
      p.email,
      p.profile_photo as "profile_photo"
    FROM causes c
    LEFT JOIN profiles p ON c.user_id = p.id
  `;

  // ✅ FIXED (no string interpolation)
  const causes = await prisma.$queryRaw<any[]>(
  status
    ? Prisma.sql`
        SELECT 
          c.id,
          c.title,
          c.category,
          c.goal,
          c.raised,
          c.status,
          c.rejection_reason as "rejectionReason",
          c.image,
          c.created_at as "created_at",
          c.updated_at as "updated_at",
          c.user_id,
          p.full_name as "full_name",
          p.email,
          p.profile_photo as "profile_photo"
        FROM causes c
        LEFT JOIN profiles p ON c.user_id = p.id
        WHERE c.status = ${status}
        ORDER BY c.created_at DESC
      `
    : Prisma.sql`
        SELECT 
          c.id,
          c.title,
          c.category,
          c.goal,
          c.raised,
          c.status,
          c.rejection_reason as "rejectionReason",
          c.image,
          c.created_at as "created_at",
          c.updated_at as "updated_at",
          c.user_id,
          p.full_name as "full_name",
          p.email,
          p.profile_photo as "profile_photo"
        FROM causes c
        LEFT JOIN profiles p ON c.user_id = p.id
        ORDER BY c.created_at DESC
      `
);

  return causes.map((cause) => ({
    id: cause.id,
    title: cause.title,
    category: cause.category,
    goal: Number(cause.goal),
    raised: Number(cause.raised),
    status: cause.status,
    rejectionReason: cause.rejectionReason,
    image: cause.image,
    created_at: cause.created_at,
    updated_at: cause.updated_at,
    user_id: cause.user_id,
    profiles: {
      full_name: cause.full_name,
      email: cause.email,
      profile_photo: cause.profile_photo,
    },
  }));
}

/**
 * Get pending cause edits for admin review
 */
export async function getCauseEdits() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  // ✅ FIXED
  const edits = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT 
      ce.id,
      ce.original_cause_id,
      ce.title,
      ce.category,
      ce.goal,
      ce.image,
      ce.multimedia,
      ce.video_links,
      ce.days_active,
      ce.status,
      ce.rejection_reason,
      ce.created_at,
      ce.updated_at,
      ce.summary,
      ce.location,
      ce.user_id,
      p.full_name as "user_fullName",
      p.email as "user_email",
      p.profile_photo as "user_profilePhoto"
    FROM cause_edits ce
    LEFT JOIN profiles p ON ce.user_id = p.id
    WHERE ce.status = 'pending'
    ORDER BY ce.created_at DESC
  `);

  const result = await Promise.all(
    edits.map(async (edit) => {
      // ✅ FIXED
      const sections = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, heading, description
        FROM cause_edit_sections
        WHERE cause_edit_id = ${edit.id}::uuid
      `);

      return {
        id: edit.id,
        original_cause_id: edit.original_cause_id,
        title: edit.title,
        category: edit.category,
        goal: Number(edit.goal),
        image: edit.image,
        multimedia: edit.multimedia || [],
        video_links: edit.video_links || [],
        days_active: edit.days_active,
        status: edit.status,
        rejection_reason: edit.rejection_reason,
        created_at: edit.created_at,
        updated_at: edit.updated_at,
        summary: edit.summary,
        location: edit.location,
        user_id: edit.user_id,
        user: {
          fullName: edit.user_fullName,
          email: edit.user_email,
          profilePhoto: edit.user_profilePhoto,
        },
        cause_edit_sections: sections,
      };
    }),
  );

  return result;
}

/**
 * Update cause status (approve/reject)
 */
export async function updateCauseStatus(
  causeId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  if (status === "approved") {
    const pendingEdit = await prisma.cause_edits.findFirst({
      where: {
        original_cause_id: causeId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
    });

    if (pendingEdit) {
      await prisma.$transaction(async (tx) => {
        await tx.cause.update({
          where: { id: causeId },
          data: {
            title: pendingEdit.title,
            category: pendingEdit.category,
            goal: pendingEdit.goal,
            image: pendingEdit.image,
            daysActive: pendingEdit.days_active,
            multimedia: pendingEdit.multimedia,
            videoLinks: pendingEdit.video_links,
            summary: pendingEdit.summary,
            location: pendingEdit.location,
            status: "approved",
            updatedAt: new Date(),
          },
        });

        const editSections = await tx.cause_edit_sections.findMany({
          where: { cause_edit_id: pendingEdit.id },
        });

        await tx.cause_sections.deleteMany({
          where: { cause_id: causeId },
        });

        if (editSections.length > 0) {
          await tx.cause_sections.createMany({
            data: editSections.map((section) => ({
              cause_id: causeId,
              heading: section.heading,
              description: section.description ?? "",
            })),
          });
        }

        await tx.cause_edit_sections.deleteMany({
          where: { cause_edit_id: pendingEdit.id },
        });

        await tx.cause_edits.delete({
          where: { id: pendingEdit.id },
        });
      });
    } else {
      await prisma.cause.update({
        where: { id: causeId },
        data: {
          status: "approved",
          updatedAt: new Date(),
        },
      });
    }
  }

  if (status === "rejected") {
    const pendingEdit = await prisma.cause_edits.findFirst({
      where: {
        original_cause_id: causeId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
    });

    if (pendingEdit) {
      await prisma.cause_edits.update({
        where: { id: pendingEdit.id },
        data: {
          status: "rejected",
          rejection_reason: rejectionReason ?? null,
          updated_at: new Date(),
        },
      });
    }

    const cause = await prisma.cause.update({
      where: { id: causeId },
      data: {
        status: "rejected",
        rejectionReason: rejectionReason ?? null,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        title: true,
      },
    });

    try {
      await sendCauseRejectedEmailForUser(cause.userId, {
        causeName: cause.title,
        rejectionReason: rejectionReason || "No reason provided",
        dashboardUrl:
          "https://www.refreeg.com/dashboard/causes?status=rejected",
      });
    } catch (err) {
      console.error("Email send failed:", err);
    }
  }

  revalidatePath("/dashboard/admin/causes");
  return { success: true };
}