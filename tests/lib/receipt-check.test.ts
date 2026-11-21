import {
  buildReceiptFieldRows,
  receiptMatch,
  receiptTab,
  type ReceiptFields,
} from "@/lib/receipts/receipt-check";

const blank: ReceiptFields = {
  vendor: null,
  receipt_date: null,
  amount: null,
  invoice_number: null,
  read_vendor: null,
  read_date: null,
  read_amount: null,
  read_invoice_number: null,
};

const entered: ReceiptFields = {
  ...blank,
  vendor: "Dala Pharmacy Ltd",
  receipt_date: new Date("2026-10-06"),
  amount: 1_200_000,
  invoice_number: "DP-00412",
};

describe("receipt field check", () => {
  it("is manual when nothing has been read off the receipt", () => {
    expect(receiptMatch(buildReceiptFieldRows(entered))).toBe("manual");
  });

  it("matches ignoring case and surrounding spaces", () => {
    const rows = buildReceiptFieldRows({
      ...entered,
      read_vendor: "  dala pharmacy ltd ",
      read_date: new Date("2026-10-06"),
      read_amount: 1_200_000,
      read_invoice_number: "dp-00412",
    });
    expect(rows.every((row) => row.result === "match")).toBe(true);
    expect(receiptMatch(rows)).toBe("match");
  });

  it("flags only the field that differs", () => {
    const rows = buildReceiptFieldRows({
      ...entered,
      read_vendor: "Dala Pharmacy Ltd",
      read_amount: 120_000,
    });
    const amount = rows.find((row) => row.field === "Amount");
    expect(amount).toMatchObject({
      result: "differs",
      entered: "₦1,200,000",
      onReceipt: "₦120,000",
    });
    expect(rows.find((row) => row.field === "Vendor")?.result).toBe("match");
    expect(rows.find((row) => row.field === "Date")?.result).toBe("unknown");
    expect(receiptMatch(rows)).toBe("mismatch");
  });

  it("maps statuses to queue tabs and drops closed receipts", () => {
    expect(receiptTab("pending", "manual")).toBe("to-verify");
    expect(receiptTab("pending", "match")).toBe("to-verify");
    expect(receiptTab("pending", "mismatch")).toBe("mismatch");
    expect(receiptTab("need_info", "mismatch")).toBe("need-info");
    expect(receiptTab("approved", "match")).toBe("verified");
    expect(receiptTab("rejected", "match")).toBeNull();
    expect(receiptTab("superseded", "match")).toBeNull();
  });
});
