import type { Option } from "@/types/options";

export const receiptQueueTabOptions = [
  { label: "To verify", value: "to-verify" },
  { label: "Mismatch", value: "mismatch" },
  { label: "Need info", value: "need-info" },
  { label: "Verified", value: "verified" },
] as const satisfies readonly Option[];

/** Amount filter on the queue; values are `min-max` in naira, empty for open-ended. */
export const receiptAmountFilterOptions = [
  { label: "Any amount", value: "all" },
  { label: "Under ₦100,000", value: "0-100000" },
  { label: "₦100,000 – ₦1M", value: "100000-1000000" },
  { label: "Over ₦1M", value: "1000000-" },
] as const satisfies readonly Option[];

export const receiptInfoReasonOptions = [
  {
    label: "Amount doesn't match the receipt",
    value: "Amount doesn't match the receipt",
  },
  { label: "Receipt is unreadable", value: "Receipt is unreadable" },
  {
    label: "Vendor doesn't match the receipt",
    value: "Vendor doesn't match the receipt",
  },
  {
    label: "Date doesn't match the receipt",
    value: "Date doesn't match the receipt",
  },
  { label: "Invoice number is missing", value: "Invoice number is missing" },
  { label: "Something else", value: "Something else" },
] as const satisfies readonly Option[];

export const receiptRejectReasonOptions = [
  {
    label: "Receipt doesn't support the claim",
    value: "Receipt doesn't support the claim",
  },
  { label: "Receipt looks altered", value: "Receipt looks altered" },
  {
    label: "Receipt is for another campaign",
    value: "Receipt is for another campaign",
  },
  {
    label: "Receipt was already submitted",
    value: "Receipt was already submitted",
  },
  { label: "Something else", value: "Something else" },
] as const satisfies readonly Option[];

export const receiptReplyByOptions = [
  { label: "2 days", value: "2" },
  { label: "3 days", value: "3" },
  { label: "5 days", value: "5" },
  { label: "7 days", value: "7" },
] as const satisfies readonly Option[];
