"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  Petition,
  PetitionWithUser,
  PetitionFormData,
  PetitionFilterOptions,
} from "@/types";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth-actions";
import { isAdminOrManager } from "./role-actions";
import {
  sendPetitionApprovedEmailForUser,
  sendPetitionRejectedEmailForUser,
} from "@/services/mail";
import { sendPetitionSubmissionAdminNotification } from "@/services/mail";
import { cache } from "react";

export async function getPetition(
  petitionId: string,
): Promise<PetitionWithUser | null> {
  const user = await getCurrentUser();

  const petition = await prisma.petitions.findUnique({
    where: { id: petitionId },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          subAccountCode: true,
          profilePhoto: true,
        },
      },
      petition_sections: {
        select: { id: true, heading: true, description: true },
      },
    },
  });

  if (!petition) return null;

  if (
    (petition.status === "pending" || petition.status === "rejected") &&
    user?.id !== petition.user_id
  ) {
    const canView = user?.id ? await isAdminOrManager(user.id) : false;
    if (!canView) {
      redirect("/");
      return null;
    }
  }

  return {
    ...petition,
    goal: Number(petition.goal),
    raised: Number(petition.raised),
    created_at: petition.created_at.toISOString(),
    updated_at: petition.updated_at.toISOString(),
    user: {
      name: petition.user?.fullName || "Anonymous",
      email: petition.user?.email || "",
      sub_account_code: petition.user?.subAccountCode || "",
    },
    sections: petition.petition_sections || [],
    multimedia: petition.multimedia || [],
    video_links: petition.video_links || [],
  } as unknown as PetitionWithUser;
}

async function uploadFileToS3(
  file: File,
  userId: string,
  petitionId: string,
  type: "cover" | "additional",
): Promise<string> {
  const ext = file.name.split('.').pop() || 'file';
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const isVideo = file.type.startsWith("video/");
  
  try {
    const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
    
    const s3Key = generateS3Key({
      entityType: "petitions",
      userId,
      entityId: petitionId,
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

export async function createPetition(
  userId: string,
  petitionData: PetitionFormData,
): Promise<Petition> {
  const petitionId = crypto.randomUUID();
  let coverImageUrl = null;
  if (petitionData.coverImage) {
    coverImageUrl = await uploadFileToS3(
      petitionData.coverImage,
      userId,
      petitionId,
      "cover",
    );
  }

  let daysActive = null;
  if (petitionData.startDate && petitionData.endDate) {
    const startDate =
      petitionData.startDate instanceof Date
        ? petitionData.startDate
        : new Date(petitionData.startDate);
    const endDate =
      petitionData.endDate instanceof Date
        ? petitionData.endDate
        : new Date(petitionData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  let multimediaUrls: string[] = [];
  if (
    petitionData.multimedia &&
    Array.isArray(petitionData.multimedia) &&
    petitionData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        petitionData.multimedia.map((file) =>
          uploadFileToS3(file, userId, petitionId, "additional"),
        ),
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  const petition = await prisma.petitions.create({
    data: {
      id: petitionId,
      user_id: userId,
      title: petitionData.title,
      category: petitionData.category,
      goal:
        typeof petitionData.goal === "string"
          ? Number.parseFloat(petitionData.goal)
          : petitionData.goal,
      status: "pending",
      image: coverImageUrl,
      days_active: daysActive,
      multimedia: multimediaUrls,
      video_links: petitionData.video_links || [],
    },
  });

  if (petitionData.sections && petitionData.sections.length > 0) {
    await prisma.petition_sections.createMany({
      data: petitionData.sections.map((section) => ({
        petition_id: petition.id,
        heading: section.heading,
        description: section.description,
      })),
    });
  }

  // Send admin notification in background
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    if (profile?.email) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
      const reviewUrl = `${baseUrl}/dashboard/admin/petitions?tab=pending`;

      sendPetitionSubmissionAdminNotification(
        profile.fullName || "User",
        profile.email,
        petitionData.title,
        reviewUrl,
      ).catch((err) => console.error("Background notification error:", err));
    }
  } catch (error) {
    console.error("Error sending petition admin notification:", error);
  }

  revalidatePath("/dashboard/petitions");

  return {
    ...petition,
    goal: Number(petition.goal),
    raised: Number(petition.raised),
    created_at: petition.created_at.toISOString(),
    updated_at: petition.updated_at.toISOString(),
  } as unknown as Petition;
}

export async function updatePetition(
  petitionId: string,
  userId: string,
  petitionData: Partial<PetitionFormData>,
): Promise<Petition> {
  let coverImageUrl = petitionData.coverImage
    ? await uploadFileToS3(petitionData.coverImage as File, userId, petitionId, "cover")
    : petitionData.image;

  let daysActive = null;
  if (petitionData.startDate && petitionData.endDate) {
    const startDate =
      petitionData.startDate instanceof Date
        ? petitionData.startDate
        : new Date(petitionData.startDate);
    const endDate =
      petitionData.endDate instanceof Date
        ? petitionData.endDate
        : new Date(petitionData.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format provided");
    }

    daysActive = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  let multimediaUrls: string[] = [];
  if (
    petitionData.multimedia &&
    Array.isArray(petitionData.multimedia) &&
    petitionData.multimedia.length > 0
  ) {
    try {
      multimediaUrls = await Promise.all(
        petitionData.multimedia.map((file) =>
          uploadFileToS3(file as File, userId, petitionId, "additional"),
        ),
      );
    } catch (error) {
      console.error("Error uploading multimedia:", error);
      throw error;
    }
  }

  const editData = {
    original_petition_id: petitionId,
    user_id: userId,
    title: petitionData.title!,
    description: petitionData.description || "",
    category: petitionData.category!,
    goal:
      typeof petitionData.goal === "string"
        ? Number.parseFloat(petitionData.goal)
        : petitionData.goal!,
    image: coverImageUrl || null,
    days_active: daysActive,
    multimedia: multimediaUrls.length > 0 ? multimediaUrls : [],
    video_links: petitionData.video_links || [],
    status: "pending",
  };

  const edit = await prisma.petition_edits.create({
    data: editData,
  });

  if (petitionData.sections && petitionData.sections.length > 0) {
    await prisma.petition_edit_sections.createMany({
      data: petitionData.sections.map((section) => ({
        petition_edit_id: edit.id,
        heading: section.heading,
        description: section.description,
      })),
    });
  }

  revalidatePath("/dashboard/petitions");
  return {
    ...edit,
    goal: Number(edit.goal),
    raised: 0,
    created_at: edit.created_at.toISOString(),
    updated_at: edit.updated_at.toISOString(),
  } as unknown as Petition;
}

export const listPetitions = cache(
  async (options: PetitionFilterOptions = {}): Promise<Petition[]> => {
    // Build where clause dynamically
    const where: any = {};

    if (options.category && options.category !== "all") {
      where.category = options.category;
    }

    if (options.status) {
      where.status = options.status;
    } else if (!options.userId) {
      where.status = "approved";
    }

    if (options.userId) {
      where.user_id = options.userId;
    }

    const petitions = await prisma.petitions.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: options.limit || undefined,
      skip: options.offset || undefined,
      include: {
        user: {
          select: { fullName: true, email: true, profilePhoto: true },
        },
      },
    });

    // Expiry side effect removed to optimize landing page (prevent unnecessary POST/UPDATE)

    const mapped = petitions.map((p) => ({
      ...p,
      goal: Number(p.goal),
      raised: Number(p.raised),
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
      profiles: p.user
        ? {
            full_name: p.user.fullName || "",
            email: p.user.email || "",
            profile_photo: p.user.profilePhoto || null,
          }
        : undefined,
    })) as unknown as Petition[];

    const isOwnerScoped = !!options.userId;
    return isOwnerScoped
      ? mapped
      : mapped.filter((p) => p.status !== ("expired" as any));
  },
);

export async function countPetitions(
  options: PetitionFilterOptions = {},
): Promise<number> {
  const where: any = {};

  if (options.category && options.category !== "all") {
    where.category = options.category;
  }

  if (options.status) {
    where.status = options.status;
  } else if (!options.userId) {
    where.status = "approved";
  }

  if (options.userId) {
    where.user_id = options.userId;
  }

  return prisma.petitions.count({ where });
}

export async function updatePetitionStatus(
  petitionId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<Petition> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const isAuthorized = await isAdminOrManager(user.id);
  if (!isAuthorized) throw new Error("Unauthorized");

  if (status === "approved") {
    // Check for pending edit
    const edit = await prisma.petition_edits.findFirst({
      where: {
        original_petition_id: petitionId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      include: {
        petition_edit_sections: {
          select: { heading: true, description: true },
        },
      },
    });

    let updatedPetition;

    if (edit) {
      // Update petition with edit data
      updatedPetition = await prisma.petitions.update({
        where: { id: petitionId },
        data: {
          title: edit.title,
          description: edit.description,
          category: edit.category,
          goal: edit.goal,
          image: edit.image,
          days_active: edit.days_active,
          multimedia: edit.multimedia || [],
          video_links: edit.video_links || [],
          status: "approved",
          updated_at: new Date(),
        },
      });

      // Replace sections if edit has sections
      if (edit.petition_edit_sections.length > 0) {
        await prisma.petition_sections.deleteMany({
          where: { petition_id: petitionId },
        });

        await prisma.petition_sections.createMany({
          data: edit.petition_edit_sections.map((s) => ({
            petition_id: petitionId,
            heading: s.heading,
            description: s.description,
          })),
        });
      }

      // Clean up edit and its sections
      await prisma.petition_edit_sections.deleteMany({
        where: { petition_edit_id: edit.id },
      });
      await prisma.petition_edits.delete({
        where: { id: edit.id },
      });
    } else {
      updatedPetition = await prisma.petitions.update({
        where: { id: petitionId },
        data: {
          status: "approved",
          updated_at: new Date(),
        },
      });
    }

    // Send approval email
    try {
      await sendPetitionApprovedEmailForUser(updatedPetition.user_id, {
        petitionName: updatedPetition.title,
      });
    } catch (emailError) {
      console.error("Error sending petition approval email:", emailError);
    }

    revalidatePath("/dashboard/admin/petitions");
    return {
      ...updatedPetition,
      goal: Number(updatedPetition.goal),
      raised: Number(updatedPetition.raised),
      created_at: updatedPetition.created_at.toISOString(),
      updated_at: updatedPetition.updated_at.toISOString(),
    } as unknown as Petition;
  }

  if (status === "rejected") {
    // Check for pending edit
    const edit = await prisma.petition_edits.findFirst({
      where: {
        original_petition_id: petitionId,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
    });

    if (edit) {
      await prisma.petition_edits.update({
        where: { id: edit.id },
        data: {
          status: "rejected",
          rejection_reason: rejectionReason || null,
        },
      });
    }

    const updatedPetition = await prisma.petitions.update({
      where: { id: petitionId },
      data: {
        status: "rejected",
        rejection_reason: rejectionReason || null,
        updated_at: new Date(),
      },
    });

    // Send rejection email
    try {
      await sendPetitionRejectedEmailForUser(updatedPetition.user_id, {
        petitionName: updatedPetition.title,
        rejectionReason: rejectionReason,
      });
    } catch (emailError) {
      console.error("Error sending petition rejection email:", emailError);
    }

    revalidatePath("/dashboard/admin/petitions");
    return {
      ...updatedPetition,
      goal: Number(updatedPetition.goal),
      raised: Number(updatedPetition.raised),
      created_at: updatedPetition.created_at.toISOString(),
      updated_at: updatedPetition.updated_at.toISOString(),
    } as unknown as Petition;
  }

  throw new Error(`Invalid status value: ${status}`);
}

export async function getPetitionEdits(): Promise<any[]> {
  const edits = await prisma.petition_edits.findMany({
    where: { status: "pending" },
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: { fullName: true, email: true, profilePhoto: true },
      },
      petition_edit_sections: {
        select: { id: true, heading: true, description: true },
      },
    },
  });

  return edits.map((edit) => ({
    ...edit,
    goal: Number(edit.goal),
    created_at: edit.created_at.toISOString(),
    updated_at: edit.updated_at.toISOString(),
    profiles: edit.user
      ? {
          full_name: edit.user.fullName,
          email: edit.user.email,
          profile_photo: edit.user.profilePhoto,
        }
      : undefined,
  }));
}

export async function getUserPetitions(userId: string): Promise<Petition[]> {
  const petitions = await prisma.petitions.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  return petitions.map((p) => ({
    ...p,
    goal: Number(p.goal),
    raised: Number(p.raised),
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  })) as unknown as Petition[];
}

export async function getUserPetitionsWithStatus(
  userId: string,
  status?: string,
): Promise<Petition[]> {
  const where: any = { user_id: userId };

  if (status && status !== "all") {
    where.status = status;
  }

  const petitions = await prisma.petitions.findMany({
    where,
    orderBy: { created_at: "desc" },
  });

  return petitions.map((p) => ({
    ...p,
    goal: Number(p.goal),
    raised: Number(p.raised),
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  })) as unknown as Petition[];
}

export async function deletePetition(petitionId: string): Promise<void> {
  await prisma.petitions.delete({
    where: { id: petitionId },
  });
}

export async function savePetitionShare(petitionId: string): Promise<void> {
  await prisma.petitions.update({
    where: { id: petitionId },
    data: {
      shared: { increment: 1 },
    },
  });
}
