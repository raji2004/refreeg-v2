"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  Cause,
  CauseWithUser,
  CauseFormData,
  CauseFilterOptions,
} from "@/types";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth-actions";
import { isAdminOrManager } from "./role-actions";
import {
  sendCauseSubmissionAdminNotification,
  sendCauseRejectedEmailForUser,
} from "@/services/mail";
import { cache } from "react";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mapPrismaToCause = (prismaCause: any): Cause => {
  return {
    ...prismaCause,
    user_id: prismaCause.userId,
    // Convert Prisma Decimal to number for the frontend
    goal: prismaCause.goal ? Number(prismaCause.goal) : 0,
    raised: prismaCause.raised ? Number(prismaCause.raised) : 0,
    shared: prismaCause.shared ? Number(prismaCause.shared) : 0,
    // Ensure dates are strings to match the interface
    created_at: prismaCause.createdAt instanceof Date ? prismaCause.createdAt.toISOString() : prismaCause.createdAt,
    updated_at: prismaCause.updatedAt instanceof Date ? prismaCause.updatedAt.toISOString() : prismaCause.updatedAt,
    start_date: prismaCause.start_date instanceof Date ? prismaCause.start_date.toISOString() : prismaCause.start_date,
    end_date: prismaCause.end_date instanceof Date ? prismaCause.end_date.toISOString() : prismaCause.end_date,
    rejection_reason: prismaCause.rejectionReason,
    days_active: prismaCause.daysActive,
    video_links: prismaCause.videoLinks,
  } as unknown as Cause;
};

/**
 * Get a cause by ID
 */
export async function getCause(causeId: string): Promise<CauseWithUser | null> {
  if (!UUID_REGEX.test(causeId)) return null;
  const user = await getCurrentUser();

  const data = await prisma.cause.findUnique({
    where: { id: causeId },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          username: true,
          subAccountCode: true,
          profilePhoto: true,
        },
      },
      sections: {
        select: {
          id: true,
          heading: true,
          description: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!data) return null;

  const isAdmin = user?.id ? await isAdminOrManager(user.id) : false;

  if (
    (data.status === "pending" || data.status === "rejected") &&
    user?.id !== data.userId &&
    !isAdmin
  ) {
    redirect("/");
    return null;
  }

  // Check if current user is following this cause
  let isFollowing = false;
  if (user?.id) {
    const followData = await prisma.campaign_follows.findFirst({
      where: { cause_id: causeId, user_id: user.id },
      select: { id: true },
    });
    isFollowing = !!followData;
  }

  const cause = {
    ...mapPrismaToCause(data),
    user: {
      name: data.user?.fullName || "Anonymous",
      email: data.user?.email || "",
      username: data.user?.username || null,
      sub_account_code: data.user?.subAccountCode || "",
      profile_photo: data.user?.profilePhoto || null,
    },
    sections: data.sections || [],
    multimedia: data.multimedia || [],
    video_links: data.videoLinks || [],
    trust_score: data.trust_score || {
      impact: "B+",
      readability: "A",
      transparency: "High",
    },
    verified_status: data.verified_status || "pending",
    summary: data.summary || null,
    location: data.location || null,
    faqs: data.faqs || [],
    isFollowing,
  } as unknown as CauseWithUser;

  return cause;
}

/**
 * Upload a file to S3 storage
 */
async function uploadFileToS3(
  file: File,
  userId: string,
  causeId: string,
  type: "cover" | "additional",
): Promise<string> {
  const ext = file.name.split('.').pop() || 'file';
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const isVideo = file.type.startsWith("video/");
  
  try {
    const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
    
    const s3Key = generateS3Key({
      entityType: "causes",
      userId,
      entityId: causeId,
      mediaType: isVideo ? "videos" : "images",
      filename: `${uniqueId}_${type}.${ext}`,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(buffer, s3Key, file.type);
    return s3Key;
  } catch (error: any) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

/**
 * Create a new cause
 */
export async function createCause(
  userId: string,
  causeData: CauseFormData,
): Promise<Cause> {
  const causeId = crypto.randomUUID();
  let coverImageUrl = null;
  if (causeData.coverImage) {
    coverImageUrl = await uploadFileToS3(
      causeData.coverImage,
      userId,
      causeId,
      "cover",
    );
  }

  let daysActive = null;
  if (causeData.startDate && causeData.endDate) {
    const startDate =
      causeData.startDate instanceof Date
        ? causeData.startDate
        : new Date(causeData.startDate);
    const endDate =
      causeData.endDate instanceof Date
        ? causeData.endDate
        : new Date(causeData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  let multimediaUrls: string[] = [];
  if (
    causeData.multimedia &&
    Array.isArray(causeData.multimedia) &&
    causeData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        causeData.multimedia.map(async (file) => {
          if (typeof file === "string") return file;
          return await uploadFileToS3(file, userId, causeId, "additional");
        }),
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  try {
    const cause = await prisma.$transaction(async (tx: any) => {
      const newCause = await tx.cause.create({
        data: {
          id: causeId,
          userId: userId,
          title: causeData.title,
          category: causeData.category,
          goal:
            typeof causeData.goal === "string"
              ? Number.parseFloat(causeData.goal)
              : causeData.goal,
          status: "pending",
          image: coverImageUrl,
          daysActive: daysActive,
          start_date: causeData.startDate
            ? new Date(causeData.startDate)
            : null,
          end_date: causeData.endDate ? new Date(causeData.endDate) : null,
          multimedia: multimediaUrls,
          videoLinks: causeData.video_links || [],
          summary: causeData.summary || null,
          location: causeData.location || null,
        },
      });

      if (causeData.sections && causeData.sections.length > 0) {
        await tx.cause_sections.createMany({
          data: causeData.sections.map((section: any) => ({
            cause_id: newCause.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return newCause;
    });

    try {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });

      if (profile?.email) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const reviewUrl = `${baseUrl}/dashboard/admin/causes?tab=pending`;

        sendCauseSubmissionAdminNotification(
          profile.fullName || "User",
          profile.email,
          causeData.title,
          reviewUrl,
        ).catch((err) => console.error("Background notification error:", err));
      }
    } catch (error) {
      console.error("Error sending cause admin notification:", error);
    }

    revalidatePath("/dashboard/causes");
    return mapPrismaToCause(cause);
  } catch (causeError) {
    console.error("Error creating cause:", causeError);
    throw causeError;
  }
}

/**
 * Submit a cause edit request (goes into cause_edits table)
 */
export async function updateCause(
  causeId: string,
  userId: string,
  causeData: Partial<CauseFormData>,
): Promise<any> {
  // Check for existing pending edit for this cause
  const existingEdit = await prisma.cause_edits.findFirst({
    where: { original_cause_id: causeId, status: "pending" },
    select: { id: true },
  });

  if (existingEdit) {
    throw new Error(
      "You already have a pending edit for this cause. Please wait for it to be reviewed before making another change.",
    );
  }

  let coverImageUrl = causeData.coverImage
    ? await uploadFileToS3(causeData.coverImage as File, userId, causeId, "cover")
    : causeData.image || null;

  let daysActive = null;
  if (causeData.startDate && causeData.endDate) {
    const startDate =
      causeData.startDate instanceof Date
        ? causeData.startDate
        : new Date(causeData.startDate);
    const endDate =
      causeData.endDate instanceof Date
        ? causeData.endDate
        : new Date(causeData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  let multimediaUrls: string[] = [];
  if (
    causeData.multimedia &&
    Array.isArray(causeData.multimedia) &&
    causeData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        causeData.multimedia.map(async (item) => {
          if (typeof item === "string") return item; // Keep existing URL
          return await uploadFileToS3(item as File, userId, causeId, "additional");
        }),
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  try {
    const editData = await prisma.$transaction(async (tx: any) => {
      const edit = await tx.cause_edits.create({
        data: {
          original_cause_id: causeId,
          user_id: userId,
          title: causeData.title || "",
          category: causeData.category || "",
          goal:
            typeof causeData.goal === "string"
              ? Number.parseFloat(causeData.goal)
              : causeData.goal || 0,
          image: coverImageUrl,
          days_active: daysActive,
          start_date: causeData.startDate
            ? new Date(causeData.startDate)
            : null,
          end_date: causeData.endDate ? new Date(causeData.endDate) : null,
          multimedia: multimediaUrls.length > 0 ? multimediaUrls : [],
          video_links: causeData.video_links || [],
          summary: causeData.summary || null,
          location: causeData.location || null,
          status: "pending",
        },
      });

      if (causeData.sections && causeData.sections.length > 0) {
        await tx.cause_edit_sections.createMany({
          data: causeData.sections.map((section: any) => ({
            cause_edit_id: edit.id,
            heading: section.heading,
            description: section.description,
          })),
        });
      }

      return edit;
    });

    try {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });

      if (profile?.email) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const reviewUrl = `${baseUrl}/dashboard/admin/causes`;

        sendCauseSubmissionAdminNotification(
          profile.fullName || "User",
          profile.email,
          causeData.title || "Cause Edit",
          reviewUrl,
        ).catch((err) => console.error("Background notification error:", err));
      }
    } catch (error) {
      console.error("Error sending cause edit admin notification:", error);
    }

    revalidatePath("/dashboard/causes");
    return editData;
  } catch (error) {
    console.error("Error saving cause edit:", error);
    throw error;
  }
}

/**
 * List causes with filtering options
 */
export const listCauses = cache(
  async (options: CauseFilterOptions = {}): Promise<Cause[]> => {
    let whereClause: any = {};

    // Category filter
    if (options.category && options.category !== "all") {
      whereClause.category = options.category;
    }

    // Status filter
    if (options.status) {
      whereClause.status = options.status;
    } else {
      if (!options.userId) {
        whereClause.status = "approved";
      }
    }

    // User filter
    if (options.userId) {
      whereClause.userId = options.userId;
    }

    // Search filter
    if (options.search && options.search.trim()) {
      whereClause.title = {
        contains: options.search.trim(),
        mode: "insensitive",
      };
    }

    // Sorting
    let orderByClause: any = { createdAt: "desc" };
    switch (options.sortBy) {
      case "latest":
        orderByClause = { createdAt: "desc" };
        break;
      case "most-funded":
        orderByClause = { raised: "desc" };
        break;
      case "ending-soon":
        orderByClause = { end_date: "asc" };
        break;
      case "recommended":
      default:
        orderByClause = { createdAt: "desc" };
        break;
    }

    try {
      const data = await prisma.cause.findMany({
        where: whereClause,
        include: {
          user: {
            select: { fullName: true, email: true, profilePhoto: true },
          },
        },
        orderBy: orderByClause,
        skip: options.offset,
        take: options.limit,
      });

      const causes = data.map((d: any) => ({
        ...mapPrismaToCause(d),
        profiles: d.user
          ? {
              full_name: d.user.fullName,
              email: d.user.email,
              profile_photo: d.user.profilePhoto,
            }
          : undefined,
      }));

      const isOwnerScoped = !!options.userId;
      const result = isOwnerScoped
        ? causes
        : causes.filter((c) => {
            if (c.status === "expired") return false;
            const now = new Date();
            if (c.end_date && new Date(c.end_date) < now) return false;
            return true;
          });

      return result;
    } catch (error) {
      console.error("Error listing causes:", error);
      throw error;
    }
  },
);

/**
 * Count causes with filtering options
 */
export async function countCauses(
  options: CauseFilterOptions = {},
): Promise<number> {
  let whereClause: any = {};

  if (!options.userId) {
    whereClause.OR = [{ end_date: null }, { end_date: { gt: new Date() } }];
    if (!options.status) {
      whereClause.status = "approved";
    } else {
      whereClause.status = options.status;
    }
  } else {
    if (options.status) {
      whereClause.status = options.status;
    }
  }

  if (options.category && options.category !== "all") {
    whereClause.category = options.category;
  }

  if (options.userId) {
    whereClause.userId = options.userId;
  }

  if (options.search && options.search.trim()) {
    whereClause.title = {
      contains: options.search.trim(),
      mode: "insensitive",
    };
  }

  try {
    const count = await prisma.cause.count({ where: whereClause });
    return count;
  } catch (error) {
    console.error("Error counting causes:", error);
    throw error;
  }
}

/**
 * Approve or reject a cause (admin function)
 */
export async function updateCauseStatus(
  causeId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<Cause> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const isAuthorized = await isAdminOrManager(user.id);
  if (!isAuthorized) throw new Error("Unauthorized");

  if (status === "approved") {
    const edit = await prisma.cause_edits.findFirst({
      where: { original_cause_id: causeId, status: "pending" },
      orderBy: { created_at: "desc" },
    });

    if (edit) {
      try {
        const updated = await prisma.$transaction(async (tx: any) => {
          const c = await tx.cause.update({
            where: { id: causeId },
            data: {
              title: edit.title,
              category: edit.category,
              goal: edit.goal,
              image: edit.image,
              daysActive: edit.days_active,
              start_date: edit.start_date || new Date(),
              end_date: edit.end_date,
              multimedia: edit.multimedia,
              videoLinks: edit.video_links,
              summary: edit.summary,
              location: edit.location,
              status: "approved",
              updatedAt: new Date(),
            },
          });

          const editSections = await tx.cause_edit_sections.findMany({
            where: { cause_edit_id: edit.id },
          });

          if (editSections.length > 0) {
            await tx.cause_sections.deleteMany({
              where: { cause_id: causeId },
            });
            await tx.cause_sections.createMany({
              data: editSections.map((s: any) => ({
                cause_id: causeId,
                heading: s.heading,
                description: s.description,
              })),
            });
          }

          await tx.cause_edits.delete({ where: { id: edit.id } });
          return c;
        });

        revalidatePath("/dashboard/admin/causes");
        return updated as unknown as Cause;
      } catch (updateError) {
        console.error("Error updating cause with approved edit:", updateError);
        throw updateError;
      }
    } else {
      try {
        const updated = await prisma.cause.update({
          where: { id: causeId },
          data: { status: "approved", updatedAt: new Date() },
        });
        revalidatePath("/dashboard/admin/causes");
        return updated as unknown as Cause;
      } catch (updateError) {
        console.error("Error approving cause:", updateError);
        throw updateError;
      }
    }
  }

  if (status === "rejected") {
    try {
      const edit = await prisma.cause_edits.findFirst({
        where: { original_cause_id: causeId, status: "pending" },
        orderBy: { created_at: "desc" },
      });

      if (edit) {
        await prisma.cause_edits.update({
          where: { id: edit.id },
          data: { status: "rejected", rejection_reason: rejectionReason },
        });
      }

      const data = await prisma.cause.update({
        where: { id: causeId },
        data: {
          status: "rejected",
          rejectionReason: rejectionReason,
          updatedAt: new Date(),
        },
      });

      try {
        await sendCauseRejectedEmailForUser(data.userId, {
          causeName: data.title,
          rejectionReason,
          dashboardUrl:
            "https://www.refreeg.com/dashboard/causes?status=rejected",
        });
      } catch (emailError) {
        console.error("Error sending cause rejection email:", emailError);
      }

      revalidatePath("/dashboard/admin/causes");
      return data as unknown as Cause;
    } catch (error) {
      console.error("Error updating cause status:", error);
      throw error;
    }
  }

  throw new Error(`Invalid status value: ${status}`);
}

/**
 * Get all pending cause edits for admin review
 */
export async function getCauseEdits(): Promise<any[]> {
  try {
    const data = await prisma.cause_edits.findMany({
      where: { status: "pending" },
      include: {
        user: { select: { fullName: true, email: true, profilePhoto: true } },
        sections: { select: { id: true, heading: true, description: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return data.map((d: any) => ({
      ...d,
      profiles: d.user
        ? {
            full_name: d.user.fullName,
            email: d.user.email,
            profile_photo: d.user.profilePhoto,
          }
        : undefined,
      cause_edit_sections: d.sections,
    }));
  } catch (error) {
    console.error("Error fetching cause edits:", error);
    throw error;
  }
}

/**
 * Get all causes for a specific user
 */
export async function getUserCauses(userId: string): Promise<Cause[]> {
  try {
    const data = await prisma.cause.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
    });
    return data.map((d: any) => mapPrismaToCause(d));
  } catch (error) {
    console.error("Error fetching user causes:", error);
    throw error;
  }
}

export async function getUserCausesWithStatus(
  userId: string,
  status?: string,
): Promise<Cause[]> {
  try {
    let whereClause: any = { userId: userId };
    if (status && status !== "all") {
      whereClause.status = status;
    }
    const data = await prisma.cause.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    return data.map((d: any) => mapPrismaToCause(d));
  } catch (error) {
    console.error("Error fetching user causes with status:", error);
    throw error;
  }
}

export async function deleteCause(causeId: string): Promise<void> {
  try {
    await prisma.cause.delete({ where: { id: causeId } });
  } catch (error) {
    console.error("Error deleting cause:", error);
    throw error;
  }
}

export async function updateCauseTrustMetrics(
  causeId: string,
  metrics: {
    trust_score?: {
      impact: string;
      readability: string;
      transparency: string;
    };
    verified_status?: string;
  },
): Promise<void> {
  const user = await getCurrentUser();
  const isAdmin = user?.id ? await isAdminOrManager(user.id) : false;

  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can update trust metrics");
  }

  try {
    await prisma.cause.update({
      where: { id: causeId },
      data: {
        trust_score: metrics.trust_score || undefined,
        verified_status: metrics.verified_status,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/admin/causes");
    revalidatePath(`/causes/${causeId}`);
  } catch (error) {
    console.error("Error updating trust metrics:", error);
    throw error;
  }
}

/**
 * Save a cause share to the database
 */
export async function saveCauseShare(
  causeId: string,
  userId?: string,
): Promise<void> {
  try {
    const updatedCause = await prisma.cause.update({
      where: { id: causeId },
      data: { shared: { increment: 1 } },
    });

    // Record event for reward tracking if userId provided
    if (userId) {
      try {
        const { recordEvent } = await import("@/actions/event-reward-actions");
        await recordEvent({
          type: "share",
          userId,
          metadata: {
            cause_id: causeId,
          },
        });
      } catch (eventError) {
        console.error("Error recording share event:", eventError);
      }

      // Emit SSE event
      try {
        const { eventBus } = await import("@/lib/event-bus");
        eventBus.emit("share", {
          type: "share",
          data: {
            cause_id: causeId,
            user_id: userId,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Error emitting share SSE:", e);
      }
    }
  } catch (error) {
    console.error("Error saving cause share:", error);
    throw error;
  }
}

/**
 * Record a cause share with user tracking
 */
export async function shareCause(
  causeId: string,
  userId: string,
): Promise<void> {
  await saveCauseShare(causeId, userId);
}

/**
 * Follow a campaign — requires authentication
 * Returns { error: 'unauthenticated' } if no session so the UI can show a login modal
 */
export async function followCampaign(
  causeId: string,
): Promise<{ data: null; error: string } | { data: any; error: null }> {
  const user = await getCurrentUser();

  if (!user) {
    return { data: null, error: "unauthenticated" };
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });

  if (!profile?.email) {
    return { data: null, error: "No email found for your account." };
  }

  try {
    const data = await prisma.campaign_follows.upsert({
      where: {
        cause_id_email: {
          cause_id: causeId,
          email: profile.email,
        },
      },
      update: {},
      create: {
        cause_id: causeId,
        user_id: user.id,
        email: profile.email,
      },
    });

    return { data, error: null };
  } catch (error: any) {
    return { data: { already_following: true }, error: null };
  }
}
