"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import { receiptDetailsSchema } from "@/lib/schemas/proof-update.schema";

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
      // Uploaded browser → S3 already: {"key","name"} with a key in this user's folder for this cause.
      let uploaded: { key?: unknown; name?: unknown };
      try {
        uploaded = JSON.parse(item);
      } catch {
        return { success: false, error: "Invalid upload." };
      }
      if (!isOwnUploadKey(uploaded.key, "causes", userId, causeId)) {
        return { success: false, error: "Invalid upload." };
      }
      const folder = uploaded.key.split("/")[4];
      const kind =
        folder === "videos"
          ? "video"
          : folder === "documents"
            ? "document"
            : "image";
      const name =
        typeof uploaded.name === "string" && uploaded.name
          ? uploaded.name
          : (uploaded.key.split("/").pop() ?? "file");
      media.push({ type: kind, url: uploaded.key, name });
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

  const details = receiptDetailsSchema.safeParse({
    receiptTitle: String(formData.get("receiptTitle") ?? ""),
    vendor: String(formData.get("vendor") ?? ""),
    receiptDate: String(formData.get("receiptDate") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
  });
  if (!details.success) {
    return { success: false, error: details.error.issues[0].message };
  }
  const receipt = details.data;

  const update = await prisma.campaign_proof_updates.create({
    data: {
      cause_id: causeId,
      user_id: userId,
      milestone,
      description,
      media, // Stored as JSONB
      receipt_title: receipt.receiptTitle || null,
      vendor: receipt.vendor || null,
      receipt_date: receipt.receiptDate ? new Date(receipt.receiptDate) : null,
      amount: receipt.amount ? Number(receipt.amount.replace(/,/g, "")) : null,
      invoice_number: receipt.invoiceNumber || null,
    },
  });

  // A reply to an admin's info request replaces the parked receipt and takes over its milestone.
  const awaitingInfo = await prisma.campaign_proof_updates.findMany({
    where: { cause_id: causeId, milestone, status: "need_info" },
    select: { id: true },
  });
  if (awaitingInfo.length > 0) {
    const awaitingIds = awaitingInfo.map((row) => row.id);
    await prisma.$transaction([
      prisma.campaign_proof_updates.updateMany({
        where: { id: { in: awaitingIds } },
        data: { status: "superseded" },
      }),
      prisma.campaign_proof_requirements.updateMany({
        where: { submitted_update_id: { in: awaitingIds } },
        data: { submitted_update_id: update.id },
      }),
    ]);
  } else {
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
  }

  revalidatePath("/dashboard/admin/receipts");
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
