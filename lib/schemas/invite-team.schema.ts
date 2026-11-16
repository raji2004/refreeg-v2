import { z } from "zod";

/** Built per render because "already invited" depends on who was just added. */
export function makeInviteSchema(pendingEmails: string[]) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .regex(/^\S+@\S+\.\S+$/, "Enter a valid email address")
      .refine(
        (value) => !pendingEmails.includes(value.toLowerCase()),
        "This email has already been invited",
      ),
    role: z.string(),
  });
}
