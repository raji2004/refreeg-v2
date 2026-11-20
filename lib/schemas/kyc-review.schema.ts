import { z } from "zod";

export const kycRedoValues = [
  "selfie",
  "date_of_birth",
  "id_document",
] as const;

export const resubmitKycSchema = z.object({
  verificationId: z.string().uuid(),
  redo: z
    .array(z.enum(kycRedoValues))
    .min(1, "Choose at least one item for the applicant to redo"),
  message: z
    .string()
    .trim()
    .min(1, "Write a short message for the applicant")
    .max(1000, "Keep the message under 1000 characters"),
});

export type ResubmitKycInput = z.infer<typeof resubmitKycSchema>;
export type KycRedoValue = (typeof kycRedoValues)[number];

export const rejectKycSchema = z.object({
  verificationId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Write the reason shown to the applicant")
    .max(1000, "Keep the reason under 1000 characters"),
});

export type RejectKycInput = z.infer<typeof rejectKycSchema>;

export const kycUserIdSchema = z.object({
  userId: z.string().min(1, "A user id is required"),
});

export const kycDecisionSchema = z.object({
  verificationId: z.string().min(1, "A verification id is required"),
  status: z.enum(["approved", "rejected", "pending"]),
  notes: z
    .string()
    .trim()
    .max(1000, "Keep the decision notes under 1000 characters")
    .optional(),
});

export const kycNeighborsSchema = z.object({
  userId: kycUserIdSchema.shape.userId,
  tab: z
    .enum(["needs-review", "resubmitted", "approved", "rejected"])
    .optional(),
});

export const userKycStatusSchema = z.object({
  verificationId: z.string().min(1, "A verification id is required"),
  status: z.enum(["pending"]),
  notes: z
    .string()
    .trim()
    .max(1000, "Keep the notes under 1000 characters")
    .optional(),
});
