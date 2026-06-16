// actions/admin-petition-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
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

  let sqlQuery = `
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
    LEFT JOIN profiles pr ON p.user_id = pr.id
  `;

  if (status) {
    sqlQuery += ` WHERE p.status = '${status}'`;
  }

  sqlQuery += ` ORDER BY p.created_at DESC`;

  const petitions = await prisma.$queryRawUnsafe<any[]>(sqlQuery);

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
 * Get pending petition edits for admin review
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

  // Get edits with user info
  const edits = await prisma.$queryRawUnsafe<any[]>(`
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
    LEFT JOIN profiles pr ON pe.user_id = pr.id
    WHERE pe.status = 'pending'
    ORDER BY pe.created_at DESC
  `);

  // Fetch sections separately for each edit
  const result = await Promise.all(
    edits.map(async (edit) => {
      const sections = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, heading, description
        FROM petition_edit_sections
        WHERE petition_edit_id = '${edit.id}'
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
 * Update petition status (approve/reject)
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

  if (status === "approved") {
    // Check for pending edit
    const pendingEdit = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM petition_edits 
      WHERE original_petition_id = '${petitionId}' 
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (pendingEdit && pendingEdit.length > 0) {
      const edit = pendingEdit[0];

      // Update the petition with edit data
      await prisma.$executeRawUnsafe(`
        UPDATE petitions 
        SET 
          title = '${edit.title.replace(/'/g, "''")}',
          description = ${edit.description ? `'${edit.description.replace(/'/g, "''")}'` : "''"},
          category = '${edit.category.replace(/'/g, "''")}',
          goal = ${edit.goal},
          image = ${edit.image ? `'${edit.image.replace(/'/g, "''")}'` : "NULL"},
          days_active = ${edit.days_active ?? "NULL"},
          multimedia = '${JSON.stringify(edit.multimedia || []).replace(/'/g, "''")}'::jsonb,
          video_links = '${JSON.stringify(edit.video_links || []).replace(/'/g, "''")}'::jsonb,
          status = 'approved',
          updated_at = NOW()
        WHERE id = '${petitionId}'
      `);

      // Delete old sections
      await prisma.$executeRawUnsafe(`
        DELETE FROM petition_sections WHERE petition_id = '${petitionId}'
      `);

      // Get edit sections
      const editSections = await prisma.$queryRawUnsafe<any[]>(`
        SELECT heading, description FROM petition_edit_sections 
        WHERE petition_edit_id = '${edit.id}'
      `);

      // Insert new sections
      for (const section of editSections) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO petition_sections (petition_id, heading, description, created_at)
          VALUES ('${petitionId}', '${section.heading.replace(/'/g, "''")}', '${section.description ? section.description.replace(/'/g, "''") : ""}', NOW())
        `);
      }

      // Delete the edit and its sections
      await prisma.$executeRawUnsafe(`
        DELETE FROM petition_edit_sections WHERE petition_edit_id = '${edit.id}'
      `);
      await prisma.$executeRawUnsafe(`
        DELETE FROM petition_edits WHERE id = '${edit.id}'
      `);
    } else {
      await prisma.$executeRawUnsafe(`
        UPDATE petitions 
        SET status = 'approved', updated_at = NOW()
        WHERE id = '${petitionId}'
      `);
    }

    // Send approval email
    const petition = await prisma.$queryRawUnsafe<any[]>(`
      SELECT user_id, title FROM petitions WHERE id = '${petitionId}'
    `);

    if (petition && petition.length > 0) {
      await sendPetitionApprovedEmailForUser(petition[0].user_id, {
        petitionName: petition[0].title,
      });
    }
  } else if (status === "rejected") {
    // Check for pending edit
    const pendingEdit = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM petition_edits 
      WHERE original_petition_id = '${petitionId}' 
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (pendingEdit && pendingEdit.length > 0) {
      const edit = pendingEdit[0];
      await prisma.$executeRawUnsafe(`
        UPDATE petition_edits 
        SET status = 'rejected', rejection_reason = ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : "NULL"}, updated_at = NOW()
        WHERE id = '${edit.id}'
      `);
    }

    // Get petition details for email
    const petition = await prisma.$queryRawUnsafe<any[]>(`
      SELECT user_id, title FROM petitions WHERE id = '${petitionId}'
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE petitions 
      SET status = 'rejected', rejection_reason = ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : "NULL"}, updated_at = NOW()
      WHERE id = '${petitionId}'
    `);

    // Send rejection email
    if (petition && petition.length > 0) {
      await sendPetitionRejectedEmailForUser(petition[0].user_id, {
        petitionName: petition[0].title,
        rejectionReason: rejectionReason || "No reason provided",
      });
    }
  }

  revalidatePath("/dashboard/admin/petitions");
  return { success: true };
}
