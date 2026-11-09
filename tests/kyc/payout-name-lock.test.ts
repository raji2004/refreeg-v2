/**
 * @jest-environment node
 */
import {
  normalizeNameTokens,
  doesBankNameMatchVerifiedName,
  evaluateBankAccountSubmission,
  submitBankChangeRequest,
  approveBankChangeRequest,
  reconcileUserPayoutAfterNameChange,
} from "@/lib/kyc/payout-name-lock";
import { prisma } from "@/lib/prisma";
import { verifyAccountNumber } from "@/services/payment-provider";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    events: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock("@/services/payment-provider", () => ({
  verifyAccountNumber: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  cause: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  profile: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  organization: {
    findFirst: jest.Mock;
  };
  events: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe("Payout Name Lock & Bank Verification Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Name Normalization & Token Matching", () => {
    it("strips Nigerian honorary and religious titles cleanly", () => {
      const tokens = normalizeNameTokens("Chief Alhaji Dr. Adeiza Jimoh");
      expect(tokens).toEqual(["adeiza", "jimoh"]);
    });

    it("handles hyphens, periods, and extra punctuation", () => {
      const tokens = normalizeNameTokens("Prof. Babatunde-Cole, O.");
      expect(tokens).toEqual(["babatunde", "cole", "o"]);
    });

    it("returns empty array for empty or whitespace-only names", () => {
      expect(normalizeNameTokens("")).toEqual([]);
      expect(normalizeNameTokens("   ")).toEqual([]);
    });
  });

  describe("2. 3-Way Nigerian Name Matcher (doesBankNameMatchVerifiedName)", () => {
    it("matches exact name regardless of Nigerian surname-first ordering", () => {
      expect(
        doesBankNameMatchVerifiedName("JIMOH ADEIZA", "Adeiza Jimoh"),
      ).toBe(true);
      expect(
        doesBankNameMatchVerifiedName("ADEIZA JIMOH", "Jimoh Adeiza"),
      ).toBe(true);
    });

    it("accepts middle-name omissions on bank accounts", () => {
      // User registered as Adeiza Jimoh, bank account includes middle name
      expect(
        doesBankNameMatchVerifiedName(
          "JIMOH ADEIZA OLUWASEUN",
          "Adeiza Jimoh",
        ),
      ).toBe(true);

      // User registered with middle name, bank omitted it
      expect(
        doesBankNameMatchVerifiedName(
          "JIMOH ADEIZA",
          "Adeiza Oluwaseun Jimoh",
        ),
      ).toBe(true);
    });

    it("strips Nigerian titles from bank account names before matching", () => {
      expect(
        doesBankNameMatchVerifiedName(
          "CHIEF ENGR. ADEIZA JIMOH",
          "Adeiza Jimoh",
        ),
      ).toBe(true);
      expect(
        doesBankNameMatchVerifiedName(
          "ALHAJA FATIMA BELLO",
          "Fatima Bello",
        ),
      ).toBe(true);
    });

    it("tolerates single-character typos in names longer than 4 characters", () => {
      // "JIMOHH" has edit distance 1 from "Jimoh"
      expect(
        doesBankNameMatchVerifiedName("ADEIZA JIMOHH", "Adeiza Jimoh"),
      ).toBe(true);
      // "JMOH" has edit distance 1 from "Jimoh"
      expect(
        doesBankNameMatchVerifiedName("ADEIZA JMOH", "Adeiza Jimoh"),
      ).toBe(true);
    });

    it("matches corporate/organization bank accounts while stripping legal suffixes", () => {
      expect(
        doesBankNameMatchVerifiedName(
          "SAVE THE CHILDREN NIGERIA LIMITED",
          null,
          "Save the Children Foundation",
        ),
      ).toBe(true);
      expect(
        doesBankNameMatchVerifiedName(
          "LAGOS FOOD INITIATIVE LTD",
          null,
          "Lagos Food Initiative",
        ),
      ).toBe(true);
    });

    it("strictly rejects completely different person names", () => {
      expect(
        doesBankNameMatchVerifiedName("CHINEDU OKAFOR", "Adeiza Jimoh"),
      ).toBe(false);
      expect(
        doesBankNameMatchVerifiedName("FATIMA MUSA", "Babatunde Cole"),
      ).toBe(false);
    });

    it("rejects null, empty, or undefined names safely without crashing", () => {
      expect(doesBankNameMatchVerifiedName(null, "Adeiza Jimoh")).toBe(false);
      expect(doesBankNameMatchVerifiedName("ADEIZA JIMOH", null)).toBe(false);
      expect(doesBankNameMatchVerifiedName("", "")).toBe(false);
    });
  });

  describe("3. Bank Account Evaluation & Live Campaign Protection", () => {
    it("locks bank accounts when user has active or pending campaigns (HTTP 403)", async () => {
      mockPrisma.cause.count.mockResolvedValue(2); // 2 active campaigns

      const result = await evaluateBankAccountSubmission("user-123", {
        accountNumber: "0123456789",
        bankCode: "058",
        bankName: "GTBank",
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain("locked while you have an active campaign");
    });

    it("auto-approves matching bank account when user has no active campaigns", async () => {
      mockPrisma.cause.count.mockResolvedValue(0);
      (verifyAccountNumber as jest.Mock).mockResolvedValue({
        account_name: "JIMOH ADEIZA",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Adeiza Jimoh",
        firstName: "Adeiza",
        lastName: "Jimoh",
      });

      const result = await evaluateBankAccountSubmission("user-123", {
        accountNumber: "0123456789",
        bankCode: "058",
        bankName: "GTBank",
      });

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.payoutVerificationStatus).toBe("verified_own");
      expect(result.resolvedAccountName).toBe("JIMOH ADEIZA");
    });

    it("rejects mismatched account and prompts for beneficiary declaration (HTTP 409)", async () => {
      mockPrisma.cause.count.mockResolvedValue(0);
      (verifyAccountNumber as jest.Mock).mockResolvedValue({
        account_name: "LAGOS TEACHING HOSPITAL",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Adeiza Jimoh",
        firstName: "Adeiza",
        lastName: "Jimoh",
      });

      const result = await evaluateBankAccountSubmission("user-123", {
        accountNumber: "0123456789",
        bankCode: "058",
        bankName: "GTBank",
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(409);
      expect(result.requiresBeneficiaryDeclaration).toBe(true);
    });

    it("routes beneficiary account to admin review when declaration is provided", async () => {
      mockPrisma.cause.count.mockResolvedValue(0);
      (verifyAccountNumber as jest.Mock).mockResolvedValue({
        account_name: "LAGOS TEACHING HOSPITAL",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Adeiza Jimoh",
      });

      const result = await evaluateBankAccountSubmission("user-123", {
        accountNumber: "0123456789",
        bankCode: "058",
        bankName: "GTBank",
        isBeneficiaryAccount: true,
        beneficiaryType: "hospital",
        beneficiaryRelationship: "Medical treatment hospital",
        proofDocumentUrl: "proofs/hospital-invoice.pdf",
      });

      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.payoutVerificationStatus).toBe("pending_beneficiary_review");
    });
  });

  describe("4. Supervised Bank Account Change Requests (Zero-Pause Rule)", () => {
    it("submits change request and leaves live campaigns running without pausing them", async () => {
      (verifyAccountNumber as jest.Mock).mockResolvedValue({
        account_name: "JIMOH ADEIZA",
      });
      mockPrisma.cause.count.mockResolvedValue(1);
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Adeiza Jimoh",
      });
      mockPrisma.events.create.mockResolvedValue({ id: "evt-123" });

      const result = await submitBankChangeRequest("user-123", {
        accountNumber: "0987654321",
        bankCode: "058",
        bankName: "GTBank",
        changeReason: "Previous bank account closed due to branch relocation",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe("evt-123");
      expect(mockPrisma.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: "user-123",
            event_type: "bank_change_request",
          }),
        }),
      );
      // Zero Pause: verify no campaign was paused or modified
      expect(mockPrisma.cause.findMany).not.toHaveBeenCalled();
    });

    it("approves supervised bank change request and updates payout details", async () => {
      mockPrisma.events.findUnique.mockResolvedValue({
        id: "evt-req-1",
        user_id: "user-123",
        event_type: "bank_change_request",
        metadata: {
          status: "pending",
          requested_account_number: "0987654321",
          requested_bank_name: "GTBank",
          requested_account_name: "JIMOH ADEIZA",
        },
      });
      mockPrisma.user.update.mockResolvedValue({ id: "user-123" });
      mockPrisma.events.update.mockResolvedValue({ id: "evt-req-1" });

      const result = await approveBankChangeRequest(
        "admin-super-1",
        "user-123",
        "evt-req-1",
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            accountNumber: "0987654321",
            bankName: "GTBank",
            accountName: "JIMOH ADEIZA",
          }),
        }),
      );
    });
  });

  describe("5. Post-Verification Name Adoption (reconcileUserPayoutAfterNameChange)", () => {
    it("flags discrepancy for admin review but NEVER pauses live campaigns", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountNumber: "0123456789",
        bankName: "GTBank",
        accountName: "KOLAWOLE JIMOH",
      });
      mockPrisma.cause.count.mockResolvedValue(3); // 3 live campaigns
      mockPrisma.events.create.mockResolvedValue({ id: "evt-flag" });

      const result = await reconcileUserPayoutAfterNameChange(
        "user-123",
        "Adeiza Jimoh",
      );

      // Name discrepancy detected
      expect(result.nameMatchesBank).toBe(false);
      expect(result.hasLiveCampaigns).toBe(true);

      // Audit event logged for admin supervision
      expect(mockPrisma.events.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            event_type: "admin_payout_flag",
          }),
        }),
      );
    });
  });
});
