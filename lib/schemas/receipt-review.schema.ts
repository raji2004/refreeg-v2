import { z } from "zod";
import { receiptReplyByOptions } from "@/lib/options/receipt-review.options";

const replyByValues = receiptReplyByOptions.map((option) => option.value) as [
  string,
  ...string[],
];

export const askReceiptInfoSchema = z.object({
  receiptId: z.string().uuid(),
  reason: z.string().trim().min(1, "Choose what's wrong"),
  message: z
    .string()
    .trim()
    .min(1, "Tell the creator what to fix")
    .max(1000, "Keep the message under 1000 characters"),
  replyByDays: z.enum(replyByValues, {
    errorMap: () => ({ message: "Choose a reply-by date" }),
  }),
});

export const rejectReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  reason: z.string().trim().min(1, "Choose a reason"),
  note: z.string().trim().max(1000, "Keep the note under 1000 characters"),
});

export type AskReceiptInfoInput = z.infer<typeof askReceiptInfoSchema>;
export type RejectReceiptInput = z.infer<typeof rejectReceiptSchema>;
