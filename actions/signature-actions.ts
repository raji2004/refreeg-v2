"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  Signature,
  SignatureWithPetition,
  SignatureFormData,
} from "@/types";

/**
 * Check if a user has already signed a petition
 * @param petitionId - The ID of the petition to check
 * @param userId - The ID of the user to check
 */
export async function checkUserSignature(
  petitionId: string,
  userId: string,
): Promise<boolean> {
  const existing = await prisma.signatures.findFirst({
    where: { petition_id: petitionId, user_id: userId },
    select: { id: true },
  });

  return !!existing;
}

/**
 * Create a new signature for a petition
 * Note: Signatures can continue even after the petition goal is reached.
 * There are no restrictions based on the number of signatures vs goal.
 * @param petitionId - The ID of the petition to sign
 */
export async function createSignature(
  petitionId: string,
  userId: string | null,
  signatureData: SignatureFormData,
): Promise<Signature> {
  // If user is logged in, check if they've already signed
  if (userId) {
    const hasSigned = await checkUserSignature(petitionId, userId);
    if (hasSigned) {
      throw new Error("You have already signed this petition");
    }
  }

  // Ensure a user (by name and email) signs only once
  const existingCount = await prisma.signatures.count({
    where: {
      petition_id: petitionId,
      email: signatureData.email,
      name: signatureData.name,
    },
  });

  if (existingCount > 0) {
    throw new Error(
      "A signature with this name and email has already been recorded for this petition.",
    );
  }

  let data: any;
  try {
    data = await prisma.signatures.create({
      data: {
        petition_id: petitionId,
        ...(userId ? { user_id: userId } : {}),
        amount:
          signatureData?.amount === undefined || signatureData?.amount === null
            ? 1
            : typeof signatureData.amount === "string"
              ? Number.parseFloat(signatureData.amount)
              : signatureData.amount,
        name:
          String(signatureData.isAnonymous).toLocaleLowerCase() === "true"
            ? "Anonymous"
            : signatureData.name,
        email: signatureData.email,
        message: signatureData.message || null,
        is_anonymous: signatureData.isAnonymous,
        status: "completed",
      },
    });
  } catch (error: any) {
    // Handle unique violation (user already signed) gracefully
    if (error?.code === "P2002") {
      throw new Error("You have already signed this petition");
    }
    console.error("Error creating signature:", error);
    throw error;
  }

  revalidatePath(`/petitions/${petitionId}`);
  revalidatePath("/petitions");
  revalidatePath("/");
  if (userId) {
    revalidatePath("/dashboard/signatures");
  }

  // Check if this signature caused the petition to reach its goal
  await checkAndSendPetitionGoalReachedEmail(petitionId);

  return {
    ...data,
    amount: Number(data.amount),
    created_at: data.created_at.toISOString(),
  } as unknown as Signature;
}

/**
 * Check if a petition has reached its goal and send notification if so
 * @param petitionId - The ID of the petition to check
 */
async function checkAndSendPetitionGoalReachedEmail(petitionId: string) {
  // Get the petition details including goal
  const petition = await prisma.petitions.findUnique({
    where: { id: petitionId },
    select: { id: true, goal: true, user_id: true, title: true },
  });

  if (!petition) {
    console.warn("Petition not found for goal check");
    return;
  }

  // Get the total signatures amount for this petition
  const result = await prisma.signatures.aggregate({
    where: { petition_id: petitionId },
    _sum: { amount: true },
  });

  const totalAmount = Number(result._sum.amount || 0);

  // Check if goal is reached (only if goal is defined and greater than 0)
  if (petition.goal && petition.goal > 0 && totalAmount >= petition.goal) {
    // Get creator's profile
    const creatorProfile = await prisma.user.findUnique({
      where: { id: petition.user_id },
      select: { email: true, fullName: true },
    });

    if (creatorProfile?.email && creatorProfile?.fullName) {
      try {
        const { sendPetitionGoalReachedEmail } = await import(
          "@/services/mail"
        );

        const petitionUrl = `${
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com"
        }/petitions/${petitionId}`;

        await sendPetitionGoalReachedEmail(
          creatorProfile.email,
          creatorProfile.fullName,
          petition.title,
          petitionUrl,
          totalAmount,
          petition.goal,
        );
      } catch (emailError) {
        console.error(
          "Failed to send petition goal reached email:",
          emailError,
        );
      }
    }
  }
}

/**
 * List signatures for a petition
 * @param petitionId - The ID of the petition to list signatures for
 */
export async function listSignaturesForPetition(
  petitionId: string,
): Promise<Signature[]> {
  const data = await prisma.signatures.findMany({
    where: { petition_id: petitionId },
    orderBy: { created_at: "desc" },
  });

  return data.map((sig) => ({
    ...sig,
    amount: Number(sig.amount),
    created_at: sig.created_at.toISOString(),
  })) as unknown as Signature[];
}

/**
 * List signatures for a user
 * @param userId - The ID of the user to list signatures for
 */
export async function listUserSignatures(
  userId: string,
  timeframe: "all" | "recent" = "all",
): Promise<SignatureWithPetition[]> {
  const where: any = { user_id: userId };

  if (timeframe === "recent") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.created_at = { gte: thirtyDaysAgo };
  }

  const data = await prisma.signatures.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      petition: {
        select: { title: true, category: true },
      },
    },
  });

  return data.map((item) => ({
    ...item,
    amount: Number(item.amount),
    created_at: item.created_at.toISOString(),
    petition: {
      title: item.petition?.title || "Unknown Petition",
      category: item.petition?.category || "Unknown",
    },
  })) as unknown as SignatureWithPetition[];
}
