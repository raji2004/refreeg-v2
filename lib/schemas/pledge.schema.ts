import { z } from "zod";

export const pledgePresets = [5000, 10000, 25000, 50000];

function formatLocalYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Earliest selectable day: today (past dates are not allowed). */
export function getMinPledgeDate() {
  return formatLocalYYYYMMDD(startOfToday());
}

export function getDefaultPledgeDate() {
  const date = startOfToday();
  date.setDate(date.getDate() + 7);
  return formatLocalYYYYMMDD(date);
}

/** Last day a pledge can be charged: the campaign's remaining days. */
export function getMaxPledgeDate(daysActive?: number | null) {
  if (!daysActive) return undefined;
  const end = startOfToday();
  end.setDate(end.getDate() + daysActive);
  return formatLocalYYYYMMDD(end);
}

export const pledgeSchema = z.object({
  amount: z.number().positive("Enter a valid amount."),
  date: z
    .string()
    .min(1, "Select a reminder date.")
    .refine(
      (value) => value >= getMinPledgeDate(),
      "Choose today, tomorrow, or a later date.",
    ),
  name: z.string().trim().min(1, "Name is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email."),
  note: z.string(),
});

export type PledgeFormFields = z.infer<typeof pledgeSchema>;
