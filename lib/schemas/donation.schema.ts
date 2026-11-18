import { z } from "zod";

export const MIN_DONATION_AMOUNT = 100;

const amountField = (message: string) =>
  z.number().min(MIN_DONATION_AMOUNT, message);

/** The Discover "Give" dialog: an amount and an email for the receipt. */
export const giveSchema = z.object({
  amount: amountField(`The smallest gift is ₦${MIN_DONATION_AMOUNT}.`),
  email: z
    .string()
    .trim()
    .min(1, "Add your email so we can send your receipt."),
});

/** The quick donate page and modal. */
export const quickDonateSchema = z
  .object({
    amount: amountField(`Minimum donation is ₦${MIN_DONATION_AMOUNT}.`),
    name: z.string().trim(),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email."),
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
