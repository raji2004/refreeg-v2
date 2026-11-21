/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({ auth: jest.fn() }));

jest.mock("@/actions/admin/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    campaign_proof_updates: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaign_proof_requirements: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/services/mail", () => ({
  sendReceiptInfoRequestedEmail: jest.fn(),
  sendProofUpdateRejectedEmail: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { prisma } from "@/lib/prisma";
import {
  sendProofUpdateRejectedEmail,
  sendReceiptInfoRequestedEmail,
} from "@/services/mail";
import {
  getAdminReceiptQueue,
  rejectReceipt,
  requestReceiptInfo,
} from "@/actions/admin/admin-receipt-actions";

const RECEIPT_ID = "6f1c3a52-7f3e-4b8f-9a55-2a9f6c0d1e11";

const row = (overrides: Record<string, unknown>) => ({
  id: "r1",
  receipt_no: 8801,
  receipt_title: "Pharmacy invoice",
  status: "pending",
  created_at: new Date("2026-11-20T10:00:00Z"),
  cause: { title: "Clean water for Dala" },
  vendor: null,
  receipt_date: null,
  amount: 1_200_000,
  invoice_number: null,
  read_vendor: null,
  read_date: null,
  read_amount: null,
  read_invoice_number: null,
  ...overrides,
});

const creatorCause = {
  title: "Clean water for Dala",
  user: { email: "creator@example.com", fullName: "Kano Water Project" },
};

describe("admin receipt actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
    (isAdminOrManager as jest.Mock).mockResolvedValue(true);
  });

  it("refuses non-reviewers", async () => {
    (isAdminOrManager as jest.Mock).mockResolvedValue(false);
    const result = await getAdminReceiptQueue();
    expect(result.error).toBe("Unauthorized");
    expect(prisma.campaign_proof_updates.findMany).not.toHaveBeenCalled();
  });

  it("sorts receipts into tabs and counts them", async () => {
    (prisma.campaign_proof_updates.findMany as jest.Mock).mockResolvedValue([
      row({ id: "a" }),
      row({ id: "b", read_amount: 120_000 }),
      row({ id: "c", status: "need_info" }),
      row({ id: "d", status: "approved" }),
    ]);
    const result = await getAdminReceiptQueue();
    expect(result.counts).toEqual({
      "to-verify": 1,
      mismatch: 1,
      "need-info": 1,
      verified: 1,
    });
    expect(result.items.find((item) => item.id === "b")).toMatchObject({
      label: "RC-8801",
      match: "mismatch",
      claimed: 1_200_000,
      readAmount: 120_000,
    });
    expect(result.nextReceiptId).toBe("a");
  });

  it("parks a pending receipt and emails the creator", async () => {
    (prisma.campaign_proof_updates.findUnique as jest.Mock).mockResolvedValue({
      status: "pending",
      receipt_no: 8812,
      cause: creatorCause,
    });
    const result = await requestReceiptInfo({
      receiptId: RECEIPT_ID,
      reason: "Amount doesn't match the receipt",
      message: "Please upload the full invoice.",
      replyByDays: "3",
    });
    expect(result).toEqual({ success: true, error: null });
    expect(prisma.campaign_proof_updates.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RECEIPT_ID },
        data: expect.objectContaining({ status: "need_info" }),
      }),
    );
    expect(sendReceiptInfoRequestedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ receiptLabel: "RC-8812" }),
    );
  });

  it("returns the schema message for an empty info request", async () => {
    const result = await requestReceiptInfo({
      receiptId: RECEIPT_ID,
      reason: "",
      message: "",
      replyByDays: "3",
    });
    expect(result).toEqual({ success: false, error: "Choose what's wrong" });
  });

  it("rejects with the reason and note joined, and frees the milestone", async () => {
    (prisma.campaign_proof_updates.findUnique as jest.Mock).mockResolvedValue({
      status: "need_info",
      receipt_no: 8812,
      cause: creatorCause,
    });
    const result = await rejectReceipt({
      receiptId: RECEIPT_ID,
      reason: "Receipt looks altered",
      note: "The total was edited.",
    });
    expect(result).toEqual({ success: true, error: null });
    expect(prisma.campaign_proof_requirements.updateMany).toHaveBeenCalledWith({
      where: { submitted_update_id: RECEIPT_ID, status: "submitted" },
      data: { status: "pending", submitted_update_id: null },
    });
    expect(sendProofUpdateRejectedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        rejectionReason: "Receipt looks altered. The total was edited.",
      }),
    );
  });

  it("won't reject a receipt that was already decided", async () => {
    (prisma.campaign_proof_updates.findUnique as jest.Mock).mockResolvedValue({
      status: "approved",
      cause: creatorCause,
    });
    const result = await rejectReceipt({
      receiptId: RECEIPT_ID,
      reason: "Receipt looks altered",
      note: "",
    });
    expect(result.success).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
