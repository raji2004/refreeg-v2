import { formatDate } from "@/lib/format-date";
import type {
  ReceiptFieldResult,
  ReceiptFieldRow,
  ReceiptMatch,
  ReceiptQueueTab,
} from "@/types/receipt-types";

type Decimalish = { toString(): string } | number | null;

/** The creator-entered and read-off-the-receipt columns of a proof update. */
export type ReceiptFields = {
  vendor: string | null;
  receipt_date: Date | null;
  amount: Decimalish;
  invoice_number: string | null;
  read_vendor: string | null;
  read_date: Date | null;
  read_amount: Decimalish;
  read_invoice_number: string | null;
};

export const receiptLabel = (receiptNo: number) => `RC-${receiptNo}`;

export const toAmount = (value: Decimalish) =>
  value == null ? null : Number(value.toString());

export const formatNaira = (value: number) =>
  `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const normalise = (value: string) => value.trim().toLowerCase();

const compare = (
  entered: string | null,
  onReceipt: string | null,
  equal: boolean,
): ReceiptFieldResult => {
  if (entered == null || onReceipt == null) return "unknown";
  return equal ? "match" : "differs";
};

const textRow = (field: string, entered: string | null, read: string | null) =>
  ({
    field,
    entered,
    onReceipt: read,
    result: compare(
      entered,
      read,
      entered != null && read != null && normalise(entered) === normalise(read),
    ),
  }) satisfies ReceiptFieldRow;

/** Vendor, date, amount and invoice no. side by side, as the reviewer sees them. */
export function buildReceiptFieldRows(
  fields: ReceiptFields,
): ReceiptFieldRow[] {
  const amount = toAmount(fields.amount);
  const readAmount = toAmount(fields.read_amount);
  const date = fields.receipt_date ? formatDate(fields.receipt_date) : null;
  const readDate = fields.read_date ? formatDate(fields.read_date) : null;

  return [
    textRow("Vendor", fields.vendor, fields.read_vendor),
    {
      field: "Date",
      entered: date,
      onReceipt: readDate,
      result: compare(date, readDate, date === readDate),
    },
    {
      field: "Amount",
      entered: amount == null ? null : formatNaira(amount),
      onReceipt: readAmount == null ? null : formatNaira(readAmount),
      result: compare(
        amount == null ? null : String(amount),
        readAmount == null ? null : String(readAmount),
        amount === readAmount,
      ),
    },
    textRow("Invoice no.", fields.invoice_number, fields.read_invoice_number),
  ];
}

export function receiptMatch(rows: ReceiptFieldRow[]): ReceiptMatch {
  if (rows.every((row) => row.onReceipt == null)) return "manual";
  return rows.some((row) => row.result === "differs") ? "mismatch" : "match";
}

/** Queue tab for a status; superseded and rejected receipts leave the queue. */
export function receiptTab(
  status: string,
  match: ReceiptMatch,
): ReceiptQueueTab | null {
  if (status === "need_info") return "need-info";
  if (status === "approved") return "verified";
  if (status !== "pending") return null;
  return match === "mismatch" ? "mismatch" : "to-verify";
}
