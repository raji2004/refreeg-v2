"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { KycVerification, KycStatus } from "@/types/kyc-types";
import { logAdminActivity } from "@/actions/database-actions";
import { isAdminOrManager } from "./role-actions";
import { getCurrentUser } from "./auth-actions";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycSubmissionAdminNotification,
  sendKycReminderEmail,
} from "@/services/mail";

export async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string,
  personalData: {
    fullName: string;
    dob: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  },
): Promise<{ documentUrl: string; error: string | null }> {
  try {
    // Check for existing KYC record using Prisma
    const existingKyc = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    if (existingKyc) {
      if (existingKyc.status === "approved") {
        return { documentUrl: "", error: "You are already verified." };
      }

      const fileExt = file.name.split(".").pop();

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        return {
          documentUrl: "",
          error: "Invalid file type. Please upload a JPEG, PNG, or PDF file.",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          documentUrl: "",
          error: "File size too large. Maximum size is 5MB.",
        };
      }

      // Use S3 for storage upload
      let fileName = "";
      try {
        const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
        const s3Key = generateS3Key({
          entityType: "kyc",
          userId,
          entityId: existingKyc.id,
          mediaType: "documents",
          filename: `${userId}_${Date.now()}.${fileExt}`,
        });
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadToS3(buffer, s3Key, file.type);
        fileName = s3Key;
      } catch (uploadError: any) {
        console.error("Error uploading document:", uploadError);
        return { documentUrl: "", error: uploadError.message };
      }

      // Update existing KYC record using Prisma
      await prisma.kyc_verifications.update({
        where: { id: existingKyc.id },
        data: {
          document_type: documentType,
          document_url: fileName,
          status: "pending",
          verification_notes: "Resubmitted for review",
          full_name: personalData.fullName,
          dob: personalData.dob,
          phone: personalData.phone,
          address: personalData.address,
          city: personalData.city,
          state: personalData.state,
          postal: personalData.postal,
          country: personalData.country,
          updated_at: new Date(),
        },
      });

      revalidatePath("/dashboard/settings/kyc");
      revalidatePath(`/dashboard/admin/users/kyc/${userId}`);

      try {
        const profile = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (profile?.email) {
          await sendKycSubmittedEmail(profile.email, personalData.fullName);
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const kycReviewUrl = `${baseUrl}/dashboard/admin/users/kyc/${userId}`;
        // Send notification in background - do not await
        sendKycSubmissionAdminNotification(
          profile?.email || "",
          personalData.fullName,
          userId,
          kycReviewUrl,
        ).catch((err) => console.error("Background notification error:", err));
      } catch (emailError) {
        console.error("Error sending KYC submission email:", emailError);
      }

      return { documentUrl: fileName, error: null };
    } else {
      const fileExt = file.name.split(".").pop();

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        return {
          documentUrl: "",
          error: "Invalid file type. Please upload a JPEG, PNG, or PDF file.",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          documentUrl: "",
          error: "File size too large. Maximum size is 5MB.",
        };
      }

      const kycId = crypto.randomUUID();
      // Use S3 for storage upload
      let fileName = "";
      try {
        const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
        const s3Key = generateS3Key({
          entityType: "kyc",
          userId,
          entityId: kycId,
          mediaType: "documents",
          filename: `${userId}_${Date.now()}.${fileExt}`,
        });
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadToS3(buffer, s3Key, file.type);
        fileName = s3Key;
      } catch (uploadError: any) {
        console.error("Error uploading document:", uploadError);
        return { documentUrl: "", error: uploadError.message };
      }
      
      // Insert new KYC record using Prisma
      await prisma.kyc_verifications.create({
        data: {
          id: kycId,
          user_id: userId,
          document_type: documentType,
          document_url: fileName,
          status: "pending",
          verification_notes: "Awaiting admin review",
          full_name: personalData.fullName,
          dob: personalData.dob,
          phone: personalData.phone,
          address: personalData.address,
          city: personalData.city,
          state: personalData.state,
          postal: personalData.postal,
          country: personalData.country,
        },
      });

      revalidatePath("/dashboard/settings/kyc");
      revalidatePath(`/dashboard/admin/users/kyc/${userId}`);

      try {
        const profile = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (profile?.email) {
          await sendKycSubmittedEmail(profile.email, personalData.fullName);
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const kycReviewUrl = `${baseUrl}/dashboard/admin/users/kyc/${userId}`;
        // Send notification in background - do not await
        sendKycSubmissionAdminNotification(
          profile?.email || "",
          personalData.fullName,
          userId,
          kycReviewUrl,
        ).catch((err) => console.error("Background notification error:", err));
      } catch (emailError) {
        console.error("Error sending KYC submission email:", emailError);
      }

      return { documentUrl: fileName, error: null };
    }
  } catch (error) {
    console.error("Error in uploadKycDocument:", error);
    return { documentUrl: "", error: "Failed to process document" };
  }
}

export async function getVerificationStatus(
  userId: string,
): Promise<{ status: KycVerification | null; error: string | null }> {
  try {
    const data = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    if (data?.document_url) {
      // Use S3 proxy for generating the URL
      if (!data.document_url.startsWith("http")) {
        (data as any).document_url = `/api/s3/image?key=${encodeURIComponent(data.document_url)}`;
      }
    }

    return { status: data as KycVerification | null, error: null };
  } catch (error) {
    console.error("Error getting verification status:", JSON.stringify(error));
    return {
      status: null,
      error:
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error) || "Failed to get status",
    };
  }
}

export async function updateVerificationStatus(
  verificationId: string,
  status: "approved" | "rejected",
  notes?: string,
): Promise<{ error: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Not authenticated" };

    const isAuthorized = await isAdminOrManager(user.id);
    if (!isAuthorized) return { error: "Unauthorized" };

    // Update KYC status using Prisma
    await prisma.kyc_verifications.update({
      where: { id: verificationId },
      data: {
        status: status,
        verification_notes:
          notes ||
          (status === "approved" ? "Approved by admin" : "Rejected by admin"),
        updated_at: new Date(),
      },
    });

    if (user) {
      if (status === "approved") {
        await logAdminActivity("approve-kyc", user.id);
      } else if (status === "rejected") {
        await logAdminActivity("reject-kyc", user.id);
      }
    }

    // Fetch the verification record to get user_id and full_name
    const verification = await prisma.kyc_verifications.findUnique({
      where: { id: verificationId },
      select: { user_id: true, full_name: true },
    });

    if (verification) {
      try {
        const profile = await prisma.user.findUnique({
          where: { id: verification.user_id },
          select: { email: true },
        });

        if (profile?.email) {
          if (status === "approved") {
            await sendKycApprovedEmail(
              profile.email,
              verification.full_name || "User",
            );
          } else if (status === "rejected") {
            await sendKycRejectedEmail(
              profile.email,
              verification.full_name || "User",
              notes ||
                "Your KYC verification was rejected. Please review and resubmit.",
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending KYC status email:", emailError);
      }

      // Update is_verified on the user profile
      if (status === "approved") {
        await prisma.user.update({
          where: { id: verification.user_id },
          data: { isVerified: true },
        });
      } else if (status === "rejected") {
        await prisma.user.update({
          where: { id: verification.user_id },
          data: { isVerified: false },
        });
      }
    } else {
      console.error(
        "[KYC] No verification record found for id:",
        verificationId,
      );
      return { error: "No verification record found for this id." };
    }

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/settings");
    return { error: null };
  } catch (error) {
    console.error("[KYC] Unhandled error in updateVerificationStatus:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : JSON.stringify(error) || "Failed to update status",
    };
  }
}

/**
 * Sends a KYC reminder email to all platform users who have not yet verified
 * their identity and have no pending KYC submission.
 * Restricted to admins and managers.
 */
export async function sendKycReminderToUnverifiedUsers(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  error: string | null;
}> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return { sent: 0, failed: 0, skipped: 0, error: "Not authenticated" };

    const authorized = await isAdminOrManager(user.id);
    if (!authorized)
      return { sent: 0, failed: 0, skipped: 0, error: "Unauthorized" };

    // Fetch all non-verified users who have a valid email address using Prisma
    const unverifiedProfiles = await prisma.user.findMany({
      where: {
        isVerified: false,
        email: { not: null },
      },
      select: { id: true, email: true, fullName: true },
    });

    if (!unverifiedProfiles || unverifiedProfiles.length === 0) {
      return { sent: 0, failed: 0, skipped: 0, error: null };
    }

    // Fetch user IDs that already have a pending or approved KYC submission
    // so we don't spam users who are already in the process
    const activeKyc = await prisma.kyc_verifications.findMany({
      where: {
        status: { in: ["pending", "approved"] },
      },
      select: { user_id: true },
    });

    const activeUserIds = new Set(activeKyc.map((k) => k.user_id));

    const eligibleUsers = unverifiedProfiles.filter(
      (p) => p.email && !activeUserIds.has(p.id),
    );

    const skipped = unverifiedProfiles.length - eligibleUsers.length;

    if (eligibleUsers.length === 0) {
      return { sent: 0, failed: 0, skipped, error: null };
    }

    // Send reminder emails in parallel, collecting results
    const results = await Promise.allSettled(
      eligibleUsers.map((profile) =>
        sendKycReminderEmail(
          profile.email as string,
          profile.fullName || "Refreegerian",
        ),
      ),
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any)?.success !== false,
    ).length;
    const failed = results.length - sent;

    console.log(
      `[KYC Reminder] Emails dispatched — sent: ${sent}, failed: ${failed}, skipped (already in progress): ${skipped}`,
    );

    await logAdminActivity("send-kyc-reminders", user.id);

    return { sent, failed, skipped, error: null };
  } catch (error) {
    console.error("[KYC Reminder] Unhandled error:", error);
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}
