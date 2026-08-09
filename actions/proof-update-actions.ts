"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdminOrManager } from "./role-actions";

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function mediaKind(mime: string): "image" | "video" | "document" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  return null;
}

async function uploadProofFile(
  file: File,
  userId: string,
  causeId: string,
): Promise<string> {
  const ext = file.name.split(".").pop() || "file";
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
  const s3Key = generateS3Key({
    entityType: "causes",
    userId,
    entityId: causeId,
    mediaType: file.type.startsWith("video/")
      ? "videos"
      : file.type === "application/pdf"
        ? "documents"
        : "images",
    filename: `${uniqueId}_proof.${ext}`,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToS3(buffer, s3Key, file.type);
  return s3Key;
}

/**
 * Creator submits a fund-use update (milestone-tagged or voluntary).
 */
export async function submitProofUpdate(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };
  const userId = session.user.id;

  const causeId = String(formData.get("causeId") || "");
  const description = String(formData.get("description") || "").trim();
  const milestoneRaw = String(formData.get("milestone") || "general");

  const cause = await prisma.cause.findUnique({
    where: { id: causeId },
    select: { id: true, userId: true, title: true },
  });
  if (!cause || cause.userId !== userId) {
    return {
      success: false,
      error: "You can only post updates for your own campaign.",
    };
  }
  if (description.length < 20) {
    return {
      success: false,
      error:
        "Please describe how the funds were used (at least 20 characters).",
    };
  }

  const media: { type: string; url: string; name: string }[] = [];
  for (const item of formData.getAll("media")) {
    if (typeof item === "string" && item.trim()) {
      // Pre-uploaded video key (future presign path)
      media.push({
        type: "video",
        url: item.trim(),
        name: item.trim().split("/").pop() ?? "video",
      });
    } else if (item instanceof File && item.size > 0) {
      const kind = mediaKind(item.type);
      if (!kind)
        return { success: false, error: `Unsupported file type: ${item.name}` };
      const limit =
        kind === "image"
          ? MAX_IMAGE_BYTES
          : kind === "document"
            ? MAX_DOC_BYTES
            : MAX_VIDEO_BYTES;
      if (item.size > limit)
        return { success: false, error: `${item.name} is too large.` };
      const url = await uploadProofFile(item, userId, causeId);
      media.push({ type: kind, url, name: item.name });
    }
  }

  if (media.length === 0) {
    return {
      success: false,
      error: "Attach at least one photo, video or document.",
    };
  }
  if (media.length > MAX_FILES) {
    return { success: false, error: `Maximum ${MAX_FILES} files.` };
  }

  const milestone =
    milestoneRaw !== "general" && Number(milestoneRaw) > 0
      ? Number(milestoneRaw)
      : null;

  const update = await prisma.campaign_proof_updates.create({
    data: {
      cause_id: causeId,
      user_id: userId,
      milestone,
      description,
      media, // Stored as JSONB
    },
  });

  // Link to the oldest pending requirement this update satisfies
  const requirement = await prisma.campaign_proof_requirements.findFirst({
    where: {
      cause_id: causeId,
      status: "pending",
      ...(milestone ? { milestone } : {}),
    },
    orderBy: { crossed_at: "asc" },
  });

  if (requirement) {
    await prisma.campaign_proof_requirements.update({
      where: { id: requirement.id },
      data: { status: "submitted", submitted_update_id: update.id },
    });
  }

  revalidatePath("/dashboard/causes");
  revalidatePath(`/causes/${causeId}`);
  return { success: true };
}

/** Public timeline: approved updates only. */
export async function getApprovedProofUpdates(causeId: string) {
  return prisma.campaign_proof_updates.findMany({
    where: { cause_id: causeId, status: "approved" },
    orderBy: { created_at: "desc" },
    include: { user: { select: { fullName: true, profilePhoto: true } } },
  });
}

/** Drives the dashboard banner: open requirements across the creator's causes. */
export async function getCreatorComplianceStatus(userId: string) {
  return prisma.campaign_proof_requirements.findMany({
    where: {
      status: { in: ["pending", "submitted"] },
      cause: { userId },
    },
    include: {
      cause: { select: { id: true, title: true, compliance_paused: true } },
    },
    orderBy: { deadline: "asc" },
  });
}

/** ADMIN: review queue. */
export async function getPendingProofUpdatesForAdmin() {
  const session = await auth();
  if (!session?.user?.id || !(await isAdminOrManager(session.user.id))) {
    throw new Error("Unauthorized");
  }
  return prisma.campaign_proof_updates.findMany({
    where: { status: "pending" },
    orderBy: { created_at: "asc" },
    include: {
      cause: { select: { id: true, title: true, compliance_paused: true } },
      user: { select: { fullName: true, email: true } },
    },
  });
}

/** ADMIN: approve → publish update, satisfy requirement, lift pause if clear. */
export async function approveProofUpdate(updateId: string) {
  const session = await auth();
  if (!session?.user?.id || !(await isAdminOrManager(session.user.id)))
    throw new Error("Unauthorized");

  const update = await prisma.campaign_proof_updates.findUnique({
    where: { id: updateId },
    include: {
      cause: {
        select: {
          id: true,
          title: true,
          userId: true,
          compliance_paused: true,
        },
      },
    },
  });
  if (!update || update.status !== "pending")
    throw new Error("Update not found");

  const result = await prisma.$transaction(async (tx) => {
    await tx.campaign_proof_updates.update({
      where: { id: updateId },
      data: { status: "approved", reviewed_at: new Date() },
    });

    const requirement = await tx.campaign_proof_requirements.findFirst({
      where: { submitted_update_id: updateId, status: "submitted" },
    });
    if (requirement) {
      await tx.campaign_proof_requirements.update({
        where: { id: requirement.id },
        data: {
          status: "satisfied",
          satisfied_at: new Date(),
          last_reminder_at: null,
        },
      });
    }

    const remaining = await tx.campaign_proof_requirements.count({
      where: {
        cause_id: update.cause_id,
        status: { in: ["pending", "submitted"] },
      },
    });

    let pauseLifted = false;
    if (remaining === 0 && update.cause.compliance_paused) {
      await tx.cause.update({
        where: { id: update.cause_id },
        data: { compliance_paused: false, compliance_paused_at: null },
      });
      pauseLifted = true;
    }
    return { pauseLifted };
  });

  // TODO: Wire up your sendMail functions here (e.g., sendProofUpdateApprovedEmail)

  revalidatePath(`/causes/${update.cause_id}`);
  revalidatePath("/causes");
  revalidatePath("/dashboard/admin/proof-updates");

  try {
    const causeWithUser = await prisma.cause.findUnique({
      where: { id: update.cause_id },
      include: { user: { select: { email: true, fullName: true } } },
    });
    if (causeWithUser?.user?.email) {
      const { sendProofUpdateApprovedEmail } = await import("@/services/mail");
      await sendProofUpdateApprovedEmail({
        to: causeWithUser.user.email,
        userName: causeWithUser.user.fullName || "there",
        causeTitle: causeWithUser.title,
        causeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com"}/causes/${update.cause_id}`,
        pauseLifted: result.pauseLifted,
      });
    }
  } catch (emailError) {
    console.error("Failed to send approval email:", emailError);
  }
  return { success: true, pauseLifted: result.pauseLifted };
}

/** ADMIN: reject → requirement returns to pending so the creator must resubmit. */
export async function rejectProofUpdate(updateId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id || !(await isAdminOrManager(session.user.id)))
    throw new Error("Unauthorized");

  const update = await prisma.campaign_proof_updates.findUnique({
    where: { id: updateId },
    include: { cause: { select: { title: true } } },
  });
  if (!update || update.status !== "pending")
    throw new Error("Update not found");

  await prisma.$transaction(async (tx) => {
    await tx.campaign_proof_updates.update({
      where: { id: updateId },
      data: {
        status: "rejected",
        rejection_reason: reason || null,
        reviewed_at: new Date(),
      },
    });
    await tx.campaign_proof_requirements.updateMany({
      where: { submitted_update_id: updateId, status: "submitted" },
      data: { status: "pending", submitted_update_id: null },
    });
  });

  // TODO: Wire up your sendMail functions here (e.g., sendProofUpdateRejectedEmail)

  revalidatePath("/dashboard/admin/proof-updates");

  try {
    const causeWithUser = await prisma.cause.findUnique({
      where: { id: update.cause_id },
      include: { user: { select: { email: true, fullName: true } } },
    });
    if (causeWithUser?.user?.email) {
      const { sendProofUpdateRejectedEmail } = await import("@/services/mail");
      await sendProofUpdateRejectedEmail({
        to: causeWithUser.user.email,
        userName: causeWithUser.user.fullName || "there",
        causeTitle: causeWithUser.title,
        rejectionReason: reason,
      });
    }
  } catch (emailError) {
    console.error("Failed to send rejection email:", emailError);
  }
  return { success: true };
}
