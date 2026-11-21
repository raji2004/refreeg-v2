import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `Keep the ${label} under ${max} characters`);

/** Receipt details a creator types next to the upload; all optional. */
export const receiptDetailsSchema = z.object({
  receiptTitle: optionalText(80, "receipt name"),
  vendor: optionalText(120, "vendor"),
  receiptDate: z
    .string()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(value)),
      "Enter a valid date",
    )
    .refine(
      (value) => value === "" || Date.parse(value) <= Date.now(),
      "The receipt date can't be in the future",
    ),
  amount: z
    .string()
    .refine(
      (value) => value === "" || Number(value.replace(/,/g, "")) > 0,
      "Enter the amount on the receipt",
    ),
  invoiceNumber: optionalText(60, "invoice number"),
});

export type ReceiptDetailsInput = z.infer<typeof receiptDetailsSchema>;
