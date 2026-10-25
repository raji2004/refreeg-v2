/**
 * @jest-environment node
 */
import { processDiditVerificationResult } from "@/services/didit-kyc";
import { getVerificationStatus } from "@/actions/kyc-actions";
import { prisma } from "@/lib/prisma";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/services/mail";
import { createNotification } from "@/lib/notifications/notification-service";
import { issueReferralRewardOnKycApproval } from "@/lib/referral-utils";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/mail", () => ({
  sendKycApprovedEmail: jest.fn(),
  sendKycRejectedEmail: jest.fn(),
  sendKycResubmittedEmail: jest.fn(),
  sendKycSubmissionAdminNotification: jest.fn(),
  sendKycSubmittedEmail: jest.fn(),
}));

jest.mock("@/lib/notifications/notification-service", () => ({
  createNotification: jest.fn(),
}));

jest.mock("@/lib/referral-utils", () => ({
  issueReferralRewardOnKycApproval: jest.fn(),
}));

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(() => ({})),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/actions/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  kyc_verifications: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe("Didit KYC Service & Verification Status Sync (Phase 1 Fixes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("B2 Fix: Exact session ID matching", () => {
    it("matches record by session ID prefix in 'sessionId:::url' without being hijacked by another session", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-session-target",
        user_id: "user-1",
        document_url:
          "session-target-id:::https://verification.didit.me/v3/session/session-target-id",
        status: "pending",
      });
      mockPrisma.kyc_verifications.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "user@example.com",
      });

      const result = await processDiditVerificationResult({
        id: "session-target-id",
        status: "Approved",
        vendorData: "user-1",
      });

      expect(result.success).toBe(true);
      // Verify query targeted the specific session_id in document_url:
      expect(mockPrisma.kyc_verifications.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            document_type: "didit",
            OR: [
              { document_url: { startsWith: "session-target-id:::" } },
              { document_url: "session-target-id" },
            ],
          }),
        }),
      );
      expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "kyc-session-target",
            status: { in: ["pending", "resubmitted"] },
          },
        }),
      );
    });
  });

  describe("B3 Fix: Idempotency & Atomic Claim", () => {
    it("guarantees side effects run only once when concurrent requests arrive", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-concurrent",
        user_id: "user-2",
        status: "pending",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "user2@example.com",
      });

      // First call wins the atomic update (count: 1)
      mockPrisma.kyc_verifications.updateMany.mockResolvedValueOnce({
        count: 1,
      });
      // Second call loses the race (count: 0, already updated)
      mockPrisma.kyc_verifications.updateMany.mockResolvedValueOnce({
        count: 0,
      });

      const payload = {
        session_id: "session-concurrent-123",
        status: "Approved",
        vendor_data: "user-2",
      };

      const [res1, res2] = await Promise.all([
        processDiditVerificationResult(payload),
        processDiditVerificationResult(payload),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res2.alreadyProcessed).toBe(true);

      // Email and rewards sent exactly ONCE:
      expect(sendKycApprovedEmail).toHaveBeenCalledTimes(1);
      expect(issueReferralRewardOnKycApproval).toHaveBeenCalledTimes(1);
      expect(createNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe("B4 Fix: In-process fallback sync without HTTP loopback", () => {
    it("getVerificationStatus successfully updates DB directly via service when Didit returns approved status", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-sync-db",
        user_id: "user-sync",
        document_type: "didit",
        document_url:
          "session-sync-999:::https://verification.didit.me/v3/session/session-sync-999",
        status: "pending",
      });
      mockPrisma.kyc_verifications.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.kyc_verifications.findUnique.mockResolvedValue({
        id: "kyc-sync-db",
        user_id: "user-sync",
        document_type: "didit",
        document_url:
          "https://verification.didit.me/v3/session/session-sync-999",
        status: "approved",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "user-sync@example.com",
      });

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "session-sync-999",
          status: "Approved",
          vendor_data: "user-sync",
        }),
      });

      const { status, error } = await getVerificationStatus("user-sync");

      expect(error).toBeNull();
      expect(status?.status).toBe("approved");

      // Verify that Didit API was fetched, and NO loopback fetch to /api/webhooks/didit occurred:
      expect(global.fetch).toHaveBeenCalledWith(
        "https://verification.didit.me/v3/session/session-sync-999",
        expect.anything(),
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/api/webhooks/didit"),
        expect.anything(),
      );

      // Verify DB was updated directly
      expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "approved" }),
        }),
      );

      global.fetch = originalFetch;
    });
  });

  describe("Session abandonment audit trail", () => {
    it("marks session as abandoned when Didit status is Expired or Abandoned instead of deleting it", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-abandoned-1",
        user_id: "user-abandoned",
        document_url: "session-abandoned:::https://didit/abandoned",
        status: "pending",
      });
      mockPrisma.kyc_verifications.update.mockResolvedValue({
        id: "kyc-abandoned-1",
        status: "abandoned",
      });

      const result = await processDiditVerificationResult({
        id: "session-abandoned",
        status: "Expired",
        vendor_data: "user-abandoned",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.kyc_verifications.update).toHaveBeenCalledWith({
        where: { id: "kyc-abandoned-1" },
        data: expect.objectContaining({
          status: "abandoned",
          verification_notes: "Session expired or abandoned in Didit",
        }),
      });
    });
  });
});
