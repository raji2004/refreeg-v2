import { z } from "zod";
import { emailAudienceValues } from "@/lib/options/email-audience.options";
import { emailLinkValues } from "@/lib/options/email-link.options";

export const TITLE_MAX = 120;
export const MESSAGE_MAX = 2000;

/**
 * Empty `sendAt` means send now. `sendLater` is the form's "Schedule" choice:
 * it makes `sendAt` required, and a given `sendAt` must always be in the future.
 */
export const announcementSchema = z
  .object({
    audience: z.enum(emailAudienceValues, {
      errorMap: () => ({ message: "Choose who gets this" }),
    }),
    title: z
      .string()
      .trim()
      .min(1, "Add a title")
      .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`),
    message: z
      .string()
      .trim()
      .min(1, "Write a message")
      .max(MESSAGE_MAX, `Keep the message under ${MESSAGE_MAX} characters`),
    linkPath: z
      .string()
      .refine((value) => emailLinkValues.includes(value), "Choose a page"),
    sendAt: z.string(),
    sendLater: z.boolean().default(false),
  })
  .superRefine(({ sendAt, sendLater }, ctx) => {
    if (!sendAt) {
      if (sendLater) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sendAt"],
          message: "Pick a time to send",
        });
      }
      return;
    }
    const time = new Date(sendAt).getTime();
    if (Number.isNaN(time) || time <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sendAt"],
        message: "Pick a time in the future",
      });
    }
  });

export type AnnouncementInput = z.input<typeof announcementSchema>;
