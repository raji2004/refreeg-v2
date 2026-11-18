import { z } from "zod";

export const petitionSignSchema = z
  .object({
    name: z.string().trim(),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email."),
    message: z.string(),
    isAnonymous: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isAnonymous && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Name is required.",
      });
    }
  });

export type PetitionSignFields = z.infer<typeof petitionSignSchema>;
