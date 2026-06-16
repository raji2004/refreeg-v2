// actions/admin-cause-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "./role-actions";
import { revalidatePath } from "next/cache";
import { sendCauseRejectedEmailForUser } from "@/services/mail";

export type CauseStatus = "pending" | "approved" | "rejected" | "expired";

// Type for the return value
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

  // Build the query with optional WHERE clause
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

  if (status) {
    sqlQuery += ` WHERE c.status = '${status}'`;
  }

  sqlQuery += ` ORDER BY c.created_at DESC`;

  // Use raw query
  const causes = await prisma.$queryRawUnsafe<any[]>(sqlQuery);

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

  // Get edits with user info
  const edits = await prisma.$queryRawUnsafe<any[]>(`
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

  // Fetch sections separately for each edit
  const result = await Promise.all(
    edits.map(async (edit) => {
      const sections = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, heading, description
        FROM cause_edit_sections
        WHERE cause_edit_id = '${edit.id}'
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
    // Check for pending edit
    const pendingEdit = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM cause_edits 
      WHERE original_cause_id = '${causeId}' 
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (pendingEdit && pendingEdit.length > 0) {
      const edit = pendingEdit[0];

      // Update the cause with edit data
      await prisma.$executeRawUnsafe(`
        UPDATE causes 
        SET 
          title = '${edit.title.replace(/'/g, "''")}',
          category = '${edit.category.replace(/'/g, "''")}',
          goal = ${edit.goal},
          image = ${edit.image ? `'${edit.image.replace(/'/g, "''")}'` : "NULL"},
          days_active = ${edit.days_active ?? "NULL"},
          multimedia = '${JSON.stringify(edit.multimedia || []).replace(/'/g, "''")}'::jsonb,
          video_links = '${JSON.stringify(edit.video_links || []).replace(/'/g, "''")}'::jsonb,
          summary = ${edit.summary ? `'${edit.summary.replace(/'/g, "''")}'` : "NULL"},
          location = ${edit.location ? `'${edit.location.replace(/'/g, "''")}'` : "NULL"},
          status = 'approved',
          updated_at = NOW()
        WHERE id = '${causeId}'
      `);

      // Delete old sections
      await prisma.$executeRawUnsafe(`
        DELETE FROM cause_sections WHERE cause_id = '${causeId}'
      `);

      // Get edit sections
      const editSections = await prisma.$queryRawUnsafe<any[]>(`
        SELECT heading, description FROM cause_edit_sections 
        WHERE cause_edit_id = '${edit.id}'
      `);

      // Insert new sections
      for (const section of editSections) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO cause_sections (cause_id, heading, description, created_at)
          VALUES ('${causeId}', '${section.heading.replace(/'/g, "''")}', '${section.description ? section.description.replace(/'/g, "''") : ""}', NOW())
        `);
      }

      // Delete the edit and its sections
      await prisma.$executeRawUnsafe(`
        DELETE FROM cause_edit_sections WHERE cause_edit_id = '${edit.id}'
      `);
      await prisma.$executeRawUnsafe(`
        DELETE FROM cause_edits WHERE id = '${edit.id}'
      `);
    } else {
      await prisma.$executeRawUnsafe(`
        UPDATE causes 
        SET status = 'approved', updated_at = NOW()
        WHERE id = '${causeId}'
      `);
    }
  } else if (status === "rejected") {
    // Check for pending edit
    const pendingEdit = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM cause_edits 
      WHERE original_cause_id = '${causeId}' 
      AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (pendingEdit && pendingEdit.length > 0) {
      const edit = pendingEdit[0];
      await prisma.$executeRawUnsafe(`
        UPDATE cause_edits 
        SET status = 'rejected', rejection_reason = ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : "NULL"}, updated_at = NOW()
        WHERE id = '${edit.id}'
      `);
    }

    // Get cause details for email
    const cause = await prisma.$queryRawUnsafe<any[]>(`
      SELECT user_id, title FROM causes WHERE id = '${causeId}'
    `);

    await prisma.$executeRawUnsafe(`
      UPDATE causes 
      SET status = 'rejected', rejection_reason = ${rejectionReason ? `'${rejectionReason.replace(/'/g, "''")}'` : "NULL"}, updated_at = NOW()
      WHERE id = '${causeId}'
    `);

    // Send rejection email
    if (cause && cause.length > 0) {
      try {
        await sendCauseRejectedEmailForUser(cause[0].user_id, {
          causeName: cause[0].title,
          rejectionReason: rejectionReason || "No reason provided",
          dashboardUrl:
            "https://www.refreeg.com/dashboard/causes?status=rejected",
        });
      } catch (emailError) {
        console.error("Error sending cause rejection email:", emailError);
      }
    }
  }

  revalidatePath("/dashboard/admin/causes");
  return { success: true };
}
