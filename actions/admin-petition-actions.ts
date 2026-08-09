"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";
import {
  sendPetitionApprovedEmailForUser,
  sendPetitionRejectedEmailForUser,
} from "@/services/mail";

export type PetitionStatus = "pending" | "approved" | "rejected";

type AdminPetitionRow = {
  id: string;
  title: string;
  category: string;
  goal: number;
  raised: number;
  status: string;
  rejection_reason: string | null;
  image: string | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    profile_photo: string | null;
  };
};

/**
 * List petitions for admin with filters
 */
export async function listAdminPetitions(
  status?: PetitionStatus,
): Promise<AdminPetitionRow[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const petitions = await prisma.$queryRaw<any[]>(
    status
      ? Prisma.sql`
          SELECT 
            p.id,
            p.title,
            p.category,
            p.goal,
            p.raised,
            p.status,
            p.rejection_reason,
            p.image,
            p.created_at,
            p.updated_at,
            p.user_id,
            pr.full_name,
            pr.email,
            pr.profile_photo
          FROM petitions p
          LEFT JOIN "User" pr ON p.user_id = pr.id
          WHERE p.status = ${status}
          ORDER BY p.created_at DESC
        `
      : Prisma.sql`
          SELECT 
            p.id,
            p.title,
            p.category,
            p.goal,
            p.raised,
            p.status,
            p.rejection_reason,
            p.image,
            p.created_at,
            p.updated_at,
            p.user_id,
            pr.full_name,
            pr.email,
            pr.profile_photo
          FROM petitions p
          LEFT JOIN "User" pr ON p.user_id = pr.id
          ORDER BY p.created_at DESC
        `,
  );

  return petitions.map((petition) => ({
    id: petition.id,
    title: petition.title,
    category: petition.category,
    goal: Number(petition.goal),
    raised: Number(petition.raised),
    status: petition.status,
    rejection_reason: petition.rejection_reason,
    image: petition.image,
    created_at: petition.created_at,
    updated_at: petition.updated_at,
    user_id: petition.user_id,
    profiles: {
      full_name: petition.full_name,
      email: petition.email,
      profile_photo: petition.profile_photo,
    },
  }));
}

/**
 * Get pending petition edits
 */
export async function getPetitionEdits() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasPermission = await isAdminOrManager(session.user.id);
  if (!hasPermission) {
    throw new Error("Unauthorized: Admin or Manager role required");
  }

  const edits = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT 
      pe.id,
      pe.original_petition_id,
      pe.title,
      pe.description,
      pe.category,
      pe.goal,
      pe.image,
      pe.multimedia,
      pe.video_links,
      pe.days_active,
      pe.status,
      pe.rejection_reason,
      pe.created_at,
      pe.updated_at,
      pe.user_id,
      pr.full_name as "user_fullName",
      pr.email as "user_email",
      pr.profile_photo as "user_profilePhoto"
    FROM petition_edits pe
    LEFT JOIN "User" pr ON pe.user_id = pr.id
    WHERE pe.status = 'pending'
    ORDER BY pe.created_at DESC
  `);

  const result = await Promise.all(
    edits.map(async (edit) => {
      const sections = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, heading, description
        FROM petition_edit_sections
        WHERE petition_edit_id = ${edit.id}
      `);

      return {
        id: edit.id,
        original_petition_id: edit.original_petition_id,
        title: edit.title,
        description: edit.description || "",
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
        user_id: edit.user_id,
        user: {
          fullName: edit.user_fullName,
          email: edit.user_email,
          profilePhoto: edit.user_profilePhoto,
        },
        petition_edit_sections: sections,
      };
    }),
  );

  return result;
}

/**
 * Update petition status
 */
export async function updatePetitionStatus(
  petitionId: string,
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

  const pendingEdit = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM petition_edits 
    WHERE original_petition_id = ${petitionId}
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (status === "approved") {
    if (pendingEdit.length > 0) {
      const edit = pendingEdit[0];

      await prisma.$executeRaw(Prisma.sql`
        UPDATE petitions 
        SET 
          title = ${edit.title},
          description = ${edit.description},
          category = ${edit.category},
          goal = ${edit.goal},
          image = ${edit.image},
          days_active = ${edit.days_active},
          multimedia = ${JSON.stringify(edit.multimedia || [])}::jsonb,
          video_links = ${JSON.stringify(edit.video_links || [])}::jsonb,
          status = 'approved',
          updated_at = NOW()
        WHERE id = ${petitionId}
      `);

      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM petition_sections WHERE petition_id = ${petitionId}
      `);

      const sections = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT heading, description
        FROM petition_edit_sections
        WHERE petition_edit_id = ${edit.id}
      `);

      for (const section of sections) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO petition_sections (petition_id, heading, description, created_at)
          VALUES (${petitionId}, ${section.heading}, ${section.description ?? ""}, NOW())
        `);
      }

      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM petition_edit_sections WHERE petition_edit_id = ${edit.id}
      `);

      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM petition_edits WHERE id = ${edit.id}
      `);
    } else {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE petitions 
        SET status = 'approved', updated_at = NOW()
        WHERE id = ${petitionId}
      `);
    }

    const petition = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT user_id, title FROM petitions WHERE id = ${petitionId}
    `);

    if (petition.length > 0) {
      await sendPetitionApprovedEmailForUser(petition[0].user_id, {
        petitionName: petition[0].title,
      });
    }
  }

  if (status === "rejected") {
    if (pendingEdit.length > 0) {
      const edit = pendingEdit[0];

      await prisma.$executeRaw(Prisma.sql`
        UPDATE petition_edits 
        SET status = 'rejected',
        rejection_reason = ${rejectionReason ?? null},
        updated_at = NOW()
        WHERE id = ${edit.id}
      `);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE petitions 
      SET status = 'rejected',
      rejection_reason = ${rejectionReason ?? null},
      updated_at = NOW()
      WHERE id = ${petitionId}
    `);

    const petition = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT user_id, title FROM petitions WHERE id = ${petitionId}
    `);

    if (petition.length > 0) {
      await sendPetitionRejectedEmailForUser(petition[0].user_id, {
        petitionName: petition[0].title,
        rejectionReason: rejectionReason || "No reason provided",
      });
    }
  }

  revalidatePath("/dashboard/admin/petitions");
  return { success: true };
}