/**
 * Tunable In-House KYC & Biometrics Configuration
 *
 * Thresholds and time-to-live settings can be calibrated via environment variables
 * without redeploying code.
 */

export const KYC_CONFIG = {
  // Biometric Cosine Similarity Thresholds
  faceAutoApproveThreshold: parseFloat(
    process.env.KYC_FACE_AUTO_APPROVE_THRESHOLD || "0.78",
  ),
  faceReviewThreshold: parseFloat(
    process.env.KYC_FACE_REVIEW_THRESHOLD || "0.55",
  ),

  // Anti-Spoofing & Liveness
  livenessMinPoseDelta: parseFloat(
    process.env.KYC_LIVENESS_MIN_POSE_DELTA || "0.08",
  ),
  livenessMinEyeAspectRatioDelta: parseFloat(
    process.env.KYC_LIVENESS_MIN_EAR_DELTA || "0.12",
  ),

  // Challenge & Session TTLs
  challengeTtlMs: parseInt(process.env.KYC_CHALLENGE_TTL_MS || "180000", 10), // 3 minutes
  handoffTtlMs: parseInt(process.env.KYC_HANDOFF_TTL_MS || "900000", 10), // 15 minutes
  inProgressTtlMs: parseInt(
    process.env.KYC_IN_PROGRESS_TTL_MS || "86400000",
    10,
  ), // 24 hours

  // Security & App Attestation
  requireAppAttestation:
    process.env.KYC_REQUIRE_APP_ATTESTATION === "true" || false,

  // S3 Storage Prefixes
  s3AuditPrefix: process.env.KYC_S3_AUDIT_PREFIX || "kyc-audit",
} as const;

export function getChallengeSecret(): string {
  const secret =
    process.env.KYC_CHALLENGE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "KYC_CHALLENGE_SECRET or NEXTAUTH_SECRET must be configured in production",
    );
  }
  return secret || "refreeg-kyc-biometric-secret-key-32b";
}

export function getHandoffSecret(): string {
  const secret =
    process.env.KYC_HANDOFF_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "KYC_HANDOFF_SECRET or NEXTAUTH_SECRET must be configured in production",
    );
  }
  return secret || "refreeg-kyc-handoff-secret-key-32b";
}

export type KycConfig = typeof KYC_CONFIG;

