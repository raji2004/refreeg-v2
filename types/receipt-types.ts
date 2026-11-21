export type ReceiptQueueTab =
  "to-verify" | "mismatch" | "need-info" | "verified";

/** `manual` means nothing has been read off the receipt yet, so a person checks it by eye. */
export type ReceiptMatch = "match" | "mismatch" | "manual";

export type ReceiptFieldResult = "match" | "differs" | "unknown";

export type ReceiptFieldRow = {
  field: string;
  entered: string | null;
  onReceipt: string | null;
  result: ReceiptFieldResult;
};

export type ReceiptQueueItem = {
  id: string;
  label: string;
  title: string;
  causeTitle: string;
  claimed: number | null;
  readAmount: number | null;
  match: ReceiptMatch;
  tab: ReceiptQueueTab;
  submittedAt: string;
};

export type ReceiptMedia = {
  type: "image" | "video" | "document";
  url: string;
  name: string;
};
