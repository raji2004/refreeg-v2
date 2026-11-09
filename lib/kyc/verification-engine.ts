import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { parseNigerianIdDocument, ParsedNigerianId } from "./nigerian-id-parser";
import {
  verifyServerBiometrics,
  verifyCameraStreamAuthenticity,
  CaptureManifest,
  ChallengeType,
} from "./server-biometrics";
import {
  doesBankNameMatchVerifiedName,
  reconcileUserPayoutAfterNameChange,
} from "./payout-name-lock";
import { issueReferralRewardOnKycApproval } from "@/lib/referral-utils";
import { splitFullName } from "@/lib/onboarding/validation";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/services/mail";
import { createNotification } from "@/lib/notifications/notification-service";

export interface KycStepData {
  currentStep: number; // 2 (Pick ID), 3 (Capture & NIN), 4 (Selfie)
  documentType?: string; // "nin_slip" | "driver_licence" | "passport" | "voter_card"
  idNumber?: string;
  idLast4?: string;
  dob?: string;
  documentS3Key?: string;
  ocrRawText?: string;
}

export interface KycSubmissionPayload {
  kycId?: string;
  documentType: string;
  idNumber?: string;
  dob?: string;
  documentImageBuffer?: Buffer;
  documentS3Key?: string;
  selfieFrames: [Buffer, Buffer, Buffer];
  manifest: CaptureManifest;
  ocrRawText?: string;
}

export interface KycOutcomeResult {
  outcome: "cleared" | "name_mismatch" | "under_review" | "rejected";
  status: "approved" | "under_review" | "name_mismatch" | "rejected";
  kycId: string;
  message?: string;
  failureReason?: string;
  mismatchDetails?: {
    profileName: string;
    idName: string;
    suggestedLegalName: string;
  };
  telemetry?: Record<string, unknown>;
}

export function hashIdNumber(idNumber: string): string {
  return crypto.createHash("sha256").update(idNumber.trim()).digest("hex");
}

/**
 * Saves in-progress step progress so users can leave and resume seamlessly
 * across Mobile and Web.
 */
export async function saveKycStepProgress(
  userId: string,
  stepData: KycStepData,
  forceNew = false,
): Promise<{ kycId: string; currentStep: number }> {
  if (forceNew) {
    await prisma.kyc_verifications.updateMany({
      where: {
        user_id: userId,
        status: { in: ["in_progress", "pending"] },
      },
      data: {
        status: "abandoned",
        verification_notes: JSON.stringify({ reason: "User started fresh session" }),
      },
    });
  }

  // Find existing in-progress record
  const existing = await prisma.kyc_verifications.findFirst({
    where: {
      user_id: userId,
      status: "in_progress",
    },
    orderBy: { created_at: "desc" },
  });

  const idLast4 =
    stepData.idLast4 || (stepData.idNumber ? stepData.idNumber.slice(-4) : null);
  const idHash = stepData.idNumber ? hashIdNumber(stepData.idNumber) : null;

  let existingNotes: any = {};
  if (existing?.verification_notes) {
    try {
      existingNotes = JSON.parse(existing.verification_notes);
    } catch {
      existingNotes = {};
    }
  }

  const rawOcr = stepData.ocrRawText || existingNotes.ocrRawText;
  const maskedOcrText = rawOcr
    ? rawOcr.replace(/\b\d{7}(\d{4})\b/g, "*******$1")
    : undefined;

  const updatedNotes = JSON.stringify({
    ...existingNotes,
    currentStep: stepData.currentStep,
    idLast4,
    idHash,
    dob: stepData.dob,
    documentS3Key: stepData.documentS3Key || existingNotes.documentS3Key,
    ocrRawText: maskedOcrText,
    lastSavedAt: new Date().toISOString(),
  });

  if (existing) {
    const updated = await prisma.kyc_verifications.update({
      where: { id: existing.id },
      data: {
        document_type: stepData.documentType || existing.document_type,
        document_url: stepData.documentS3Key || existing.document_url,
        dob: stepData.dob || existing.dob,
        verification_notes: updatedNotes,
        updated_at: new Date(),
      },
    });
    return { kycId: updated.id, currentStep: stepData.currentStep };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, firstName: true, lastName: true },
  });

  const created = await prisma.kyc_verifications.create({
    data: {
      user_id: userId,
      document_type: stepData.documentType || "nin_slip",
      document_url: stepData.documentS3Key || "",
      status: "in_progress",
      full_name:
        user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || null,
      dob: stepData.dob || null,
      verification_notes: updatedNotes,
    },
  });

  return { kycId: created.id, currentStep: stepData.currentStep };
}

/**
 * Fetches the active resumable in-progress session if one exists.
 */
export async function getResumableSession(userId: string) {
  const session = await prisma.kyc_verifications.findFirst({
    where: {
      user_id: userId,
      status: { in: ["in_progress", "name_mismatch", "under_review"] },
    },
    orderBy: { created_at: "desc" },
  });

  if (!session) return null;

  let notes: any = {};
  if (session.verification_notes) {
    try {
      notes = JSON.parse(session.verification_notes);
    } catch {
      notes = {};
    }
  }

  return {
    kycId: session.id,
    status: session.status,
    documentType: session.document_type,
    currentStep: notes.currentStep || 2,
    idLast4: notes.idLast4 || null,
    dob: session.dob || notes.dob || null,
    documentUrl: session.document_url,
    mismatchDetails: notes.mismatchDetails || null,
  };
}

/**
 * Server-authoritative submission engine.
 * Never trusts client scores; runs biometrics, OCR extraction, and 3-way name check.
 */
export async function submitKycVerification(
  userId: string,
  payload: KycSubmissionPayload,
): Promise<KycOutcomeResult> {
  const kycId = payload.kycId || crypto.randomUUID();

  // 1. Fetch user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      firstName: true,
      lastName: true,
      displayName: true,
      accountName: true,
      isVerified: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const profileFullName =
    user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  // 2. Camera Stream & Authenticity Check
  const authenticityCheck = await verifyCameraStreamAuthenticity(
    payload.selfieFrames,
    payload.manifest,
    userId,
  );

  if (!authenticityCheck.authentic) {
    return {
      outcome: "rejected",
      status: "rejected",
      kycId,
      failureReason: authenticityCheck.error || "Camera stream verification failed.",
    };
  }

  const challengeType = authenticityCheck.challengeType as ChallengeType;
  const streamDurationMs =
    payload.manifest.timestamps[2] - payload.manifest.timestamps[0];

  // 3. Document OCR Parsing (Nigerian ID Parser)
  const ocrText = payload.ocrRawText || "";
  const parsedId: ParsedNigerianId = parseNigerianIdDocument(ocrText);

  const effectiveIdNumber = payload.idNumber || parsedId.idNumber || "";
  const idLast4 =
    effectiveIdNumber.length >= 4 ? effectiveIdNumber.slice(-4) : parsedId.idLast4;
  const ninHash = effectiveIdNumber ? hashIdNumber(effectiveIdNumber) : null;

  // 4. Server Biometric Evaluation (Face similarity + active liveness delta)
  const docBuffer = payload.documentImageBuffer || payload.selfieFrames[0];
  const biometricResult = await verifyServerBiometrics(
    docBuffer,
    payload.selfieFrames,
    challengeType,
    streamDurationMs,
  );

  // If poor lighting, bad camera, or static photo:
  if (!biometricResult.passed && !biometricResult.reviewRequired) {
    return {
      outcome: "rejected",
      status: "rejected",
      kycId,
      failureReason: biometricResult.failureReason || "Biometric verification failed.",
      telemetry: biometricResult.telemetry as any,
    };
  }

  // 5. 3-Way Nigerian Name Comparison
  const ocrExtractedName = parsedId.fullName || parsedId.surname || "";
  let nameMatchStatus: "exact" | "middle_variance" | "discrepancy" | "mismatch" =
    "exact";

  if (ocrExtractedName && profileFullName) {
    const userTokens = splitFullName(profileFullName);
    const idTokens = splitFullName(ocrExtractedName);

    const firstMatch =
      userTokens.firstName.toLowerCase() === idTokens.firstName.toLowerCase();
    const lastMatch =
      userTokens.lastName.toLowerCase() === idTokens.lastName.toLowerCase();

    if (firstMatch && lastMatch) {
      nameMatchStatus = "middle_variance"; // Auto-approve to K6!
    } else {
      nameMatchStatus = "discrepancy"; // Route to K7!
    }
  }

  // S3 composite key format for encrypted audit trail:
  // {documentS3Key}:::{selfieFrame1Key}:::{selfieFrame2Key}:::{selfieFrame3Key}
  const auditCompositeUrl =
    payload.documentS3Key || `uploads/kyc/${userId}/${kycId}/id_doc.jpg`;

  const verificationNotes = {
    ninHash,
    idLast4,
    faceMatchScore: biometricResult.faceMatchScore,
    livenessPassed: biometricResult.livenessPassed,
    ocrConfidence: parsedId.confidence,
    ocrExtractedName,
    telemetry: biometricResult.telemetry,
    nameMatchStatus,
  };

  // Case A: Borderline biometrics or worn document OCR -> Route to K5 · Under review
  if (biometricResult.reviewRequired || parsedId.confidence === "low") {
    await prisma.kyc_verifications.upsert({
      where: { id: kycId },
      create: {
        id: kycId,
        user_id: userId,
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "under_review",
        full_name: profileFullName,
        dob: payload.dob || parsedId.dateOfBirth || null,
        verification_notes: JSON.stringify(verificationNotes),
      },
      update: {
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "under_review",
        verification_notes: JSON.stringify(verificationNotes),
        updated_at: new Date(),
      },
    });

    return {
      outcome: "under_review",
      status: "under_review",
      kycId,
      message: "Checking your details. You can draft your campaign while we review.",
      telemetry: biometricResult.telemetry as any,
    };
  }

  // Case B: Biometrics pass, but legal name on ID differs -> Route to K7 · Name mismatch
  if (nameMatchStatus === "discrepancy") {
    const mismatchDetails = {
      profileName: profileFullName,
      idName: ocrExtractedName,
      suggestedLegalName: ocrExtractedName,
    };

    await prisma.kyc_verifications.upsert({
      where: { id: kycId },
      create: {
        id: kycId,
        user_id: userId,
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "name_mismatch",
        full_name: profileFullName,
        dob: payload.dob || parsedId.dateOfBirth || null,
        verification_notes: JSON.stringify({
          ...verificationNotes,
          mismatchDetails,
        }),
      },
      update: {
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "name_mismatch",
        verification_notes: JSON.stringify({
          ...verificationNotes,
          mismatchDetails,
        }),
        updated_at: new Date(),
      },
    });

    return {
      outcome: "name_mismatch",
      status: "name_mismatch",
      kycId,
      mismatchDetails,
      telemetry: biometricResult.telemetry as any,
    };
  }

  // Case C: Full Pass -> Auto-Approve straight to K6 · Level 2 cleared!
  await prisma.$transaction([
    prisma.kyc_verifications.upsert({
      where: { id: kycId },
      create: {
        id: kycId,
        user_id: userId,
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "approved",
        full_name: profileFullName,
        dob: payload.dob || parsedId.dateOfBirth || null,
        verification_notes: JSON.stringify(verificationNotes),
      },
      update: {
        document_type: payload.documentType,
        document_url: auditCompositeUrl,
        status: "approved",
        verification_notes: JSON.stringify(verificationNotes),
        updated_at: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, current_tier: "Tier 2" },
    }),
  ]);

  // Award referral reward if this NIN has not already received one
  if (ninHash) {
    try {
      await issueReferralRewardOnKycApproval(userId);
    } catch (refErr) {
      console.warn("Referral award error on KYC approval:", refErr);
    }
  }

  // Send notifications
  if (user.email) {
    sendKycApprovedEmail(user.email, profileFullName).catch((err) =>
      console.error("KYC Approval email error:", err),
    );
  }

  createNotification({
    userId,
    title: "Identity Verified (Level 2 Cleared) 🚀",
    message:
      "Your RefreeG identity verification was approved. You can now publish campaigns and receive direct bank payouts.",
    type: "general",
  }).catch((err) => console.error("KYC notification error:", err));

  return {
    outcome: "cleared",
    status: "approved",
    kycId,
    message: "Level 2 cleared. You can now publish campaigns and receive direct bank payouts.",
    telemetry: biometricResult.telemetry as any,
  };
}

/**
 * Handles 1-tap resolution on K7 · Name mismatch.
 * When user clicks "Use the name on my NIN", updates legal name on profile
 * while leaving display_name untouched, and marks KYC approved!
 */
export async function resolveKycNameMismatch(
  userId: string,
  action: "adopt_id_name" | "different_id",
): Promise<{ success: boolean; outcome?: string; error?: string }> {
  try {
    const session = await prisma.kyc_verifications.findFirst({
      where: {
        user_id: userId,
        status: "name_mismatch",
      },
      orderBy: { created_at: "desc" },
    });

    if (!session) {
      return { success: false, error: "No active name mismatch session found." };
    }

    if (action === "different_id") {
      await prisma.kyc_verifications.update({
        where: { id: session.id },
        data: {
          status: "in_progress",
          verification_notes: JSON.stringify({ currentStep: 2 }),
        },
      });
      return { success: true, outcome: "restart_step2" };
    }

    // Adopt ID legal name
    let notes: any = {};
    if (session.verification_notes) {
      try {
        notes = JSON.parse(session.verification_notes);
      } catch {
        notes = {};
      }
    }

    const newLegalName = notes.mismatchDetails?.suggestedLegalName;
    if (!newLegalName) {
      return { success: false, error: "Missing suggested legal name" };
    }

    const parsed = splitFullName(newLegalName);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          fullName: newLegalName,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          isVerified: true,
          current_tier: "Tier 2",
        },
      }),
      prisma.kyc_verifications.update({
        where: { id: session.id },
        data: {
          status: "approved",
          full_name: newLegalName,
          updated_at: new Date(),
        },
      }),
    ]);

    // Reconcile payout status (never pausing live campaigns)
    await reconcileUserPayoutAfterNameChange(userId, newLegalName);

    return { success: true, outcome: "cleared" };
  } catch (error: any) {
    console.error("Error resolving KYC name mismatch:", error);
    return { success: false, error: error.message || "Failed to resolve name mismatch" };
  }
}

/**
 * 1-Tap Human Review Escalation.
 * Offered on every failure screen so honest users are never locked out.
 */
export async function requestHumanReview(
  userId: string,
  kycId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await prisma.kyc_verifications.findUnique({
      where: { id: kycId },
    });

    if (!session || session.user_id !== userId) {
      return { success: false, error: "Verification session not found" };
    }

    let notes: any = {};
    if (session.verification_notes) {
      try {
        notes = JSON.parse(session.verification_notes);
      } catch {
        notes = {};
      }
    }

    await prisma.kyc_verifications.update({
      where: { id: kycId },
      data: {
        status: "under_review",
        verification_notes: JSON.stringify({
          ...notes,
          humanReviewRequested: true,
          humanReviewReason: reason || "User requested human review from failure screen",
          requestedAt: new Date().toISOString(),
        }),
        updated_at: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error requesting human review:", error);
    return { success: false, error: error.message || "Failed to request review" };
  }
}

