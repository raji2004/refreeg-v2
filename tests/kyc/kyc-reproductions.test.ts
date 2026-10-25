/**
 * @jest-environment node
 */
import crypto from "crypto";
import { POST as diditWebhookPOST } from "@/app/api/webhooks/didit/route";
import { POST as mobileKycPOST } from "@/app/api/mobile/kyc/route";
import { getVerificationStatus } from "@/actions/kyc-actions";
import { prisma } from "@/lib/prisma";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { sendKycApprovedEmail } from "@/services/mail";
import { createNotification } from "@/lib/notifications/notification-service";
import { issueReferralRewardOnKycApproval } from "@/lib/referral-utils";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  kyc_verifications: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe("KYC Phase 1 Fixes & Verification Suite (B1 - B5)", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "test-secret-12345";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, DIDIT_WEBHOOK_SECRET: TEST_SECRET };
    mockPrisma.kyc_verifications.updateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const signPayload = (bodyStr: string, secret: string) => {
    return crypto
      .createHmac("sha256", secret)
      .update(bodyStr, "utf-8")
      .digest("hex");
  };

  const createSignedWebhookRequest = (body: any, secret?: string) => {
    const rawBody = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) {
      headers["x-signature-v2"] = signPayload(rawBody, secret);
    }
    return new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers,
      body: rawBody,
    });
  };

  describe("B1 Verified: Fail closed in production", () => {
    it("rejects unauthenticated requests in production when secret is missing with 401", async () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.DIDIT_WEBHOOK_SECRET;

      const unsignedReq = createSignedWebhookRequest({
        id: "session-fake",
        status: "Approved",
        vendorData: "user-1",
      });

      const res = await diditWebhookPOST(unsignedReq);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Invalid webhook signature");
      expect(mockPrisma.kyc_verifications.updateMany).not.toHaveBeenCalled();
    });

    it("accepts valid signed requests when secret is set", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        user_id: "user-1",
        status: "pending",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const signedReq = createSignedWebhookRequest(
        { id: "session-ok", status: "Approved", vendorData: "user-1" },
        TEST_SECRET,
      );

      const res = await diditWebhookPOST(signedReq);
      expect(res.status).toBe(200);
      expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalled();
    });
  });

  describe("B2 Verified: Session matching by session ID", () => {
    it("matches specific session using startsWith on 'sessionId:::url'", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-specific-session",
        user_id: "user-1",
        document_url:
          "session-target:::https://verification.didit.me/v3/session/session-target",
        status: "pending",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const req = createSignedWebhookRequest(
        { id: "session-target", status: "Approved", vendorData: "user-1" },
        TEST_SECRET,
      );

      const res = await diditWebhookPOST(req);
      expect(res.status).toBe(200);

      // Verified: findFirst was called matching the exact session ID in document_url
      expect(mockPrisma.kyc_verifications.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            document_type: "didit",
            OR: [
              { document_url: { startsWith: "session-target:::" } },
              { document_url: "session-target" },
            ],
          }),
        }),
      );
    });
  });

  describe("B3 Verified: Idempotency & Atomic Claim", () => {
    it("prevents duplicate side effects on concurrent deliveries via atomic updateMany", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        user_id: "user-1",
        status: "pending",
        full_name: "Test User",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      // First call succeeds: count = 1
      mockPrisma.kyc_verifications.updateMany.mockResolvedValueOnce({
        count: 1,
      });
      // Second concurrent call loses race: count = 0
      mockPrisma.kyc_verifications.updateMany.mockResolvedValueOnce({
        count: 0,
      });

      const req1 = createSignedWebhookRequest(
        { id: "session-1", status: "Approved", vendorData: "user-1" },
        TEST_SECRET,
      );
      const req2 = createSignedWebhookRequest(
        { id: "session-1", status: "Approved", vendorData: "user-1" },
        TEST_SECRET,
      );

      const [res1, res2] = await Promise.all([
        diditWebhookPOST(req1),
        diditWebhookPOST(req2),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Verified: sendKycApprovedEmail and createNotification called exactly ONCE
      expect(sendKycApprovedEmail).toHaveBeenCalledTimes(1);
      expect(createNotification).toHaveBeenCalledTimes(1);
      expect(issueReferralRewardOnKycApproval).toHaveBeenCalledTimes(1);
    });
  });

  describe("B4 Verified: In-process fallback sync", () => {
    it("getVerificationStatus syncs with Didit in-process without unsigned loopback HTTP calls", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-sync-1",
        user_id: "user-sync-1",
        document_type: "didit",
        document_url:
          "session-abc:::https://verification.didit.me/v3/session/session-abc",
        status: "pending",
      });
      mockPrisma.kyc_verifications.findUnique.mockResolvedValue({
        id: "kyc-sync-1",
        user_id: "user-sync-1",
        document_type: "didit",
        document_url: "https://verification.didit.me/v3/session/session-abc",
        status: "approved",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "sync@example.com",
      });

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "session-abc",
          status: "Approved",
          vendor_data: "user-sync-1",
        }),
      });

      const { status, error } = await getVerificationStatus("user-sync-1");
      expect(error).toBeNull();
      expect(status?.status).toBe("approved");

      // Verified: No HTTP fetch made to /api/webhooks/didit
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/api/webhooks/didit"),
        expect.anything(),
      );

      global.fetch = originalFetch;
    });
  });

  describe("B5 Verified: Mobile session reuse, abandonment, and DB error handling", () => {
    it("reuses active pending session when user returns without force_new", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-reuse", fullName: "Reuse User" },
      });

      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-reuse-1",
        user_id: "user-reuse",
        status: "pending",
        document_url:
          "didit-active-123:::https://verification.didit.me/v3/session/didit-active-123",
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      });

      const req = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });

      const res = await mobileKycPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.session_id).toBe("didit-active-123");
      expect(json.data.resumed).toBe(true);
    });

    it("marks old pending records as abandoned when creating a new session", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-new", fullName: "New User" },
      });

      mockPrisma.kyc_verifications.findFirst.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session_id: "didit-brand-new",
          session_token: "token-999",
          url: "https://verification.didit.me/v3/session/didit-brand-new",
        }),
      });

      const req = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
        body: JSON.stringify({ force_new: true }),
      });

      const res = await mobileKycPOST(req);
      expect(res.status).toBe(201);

      // Verified: marks old pending as abandoned
      expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: "user-new",
          status: "pending",
        },
        data: {
          status: "abandoned",
          verification_notes: "Superseded by new verification session",
        },
      });

      global.fetch = originalFetch;
    });

    it("returns 500 and does NOT return a token if DB create fails", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: { id: "user-fail", fullName: "Fail User" },
      });

      mockPrisma.kyc_verifications.findFirst.mockResolvedValue(null);

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session_id: "didit-untracked",
          session_token: "token-fail",
          url: "https://verification.didit.me/v3/session/didit-untracked",
        }),
      });

      mockPrisma.kyc_verifications.create.mockRejectedValue(
        new Error("Database connection dropped"),
      );

      const req = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });

      const res = await mobileKycPOST(req);
      // Verified: DB error is NOT swallowed, returns 500!
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Internal server error");

      global.fetch = originalFetch;
    });
  });
});
