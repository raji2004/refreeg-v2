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
