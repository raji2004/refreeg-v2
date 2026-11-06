/**
 * @jest-environment node
 */
import crypto from "crypto";
import { POST } from "@/app/api/webhooks/didit/route";
import { prisma } from "@/lib/prisma";
import { sendKycApprovedEmail } from "@/services/mail";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
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

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@/lib/referral-utils", () => ({
  issueReferralRewardOnKycApproval: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  kyc_verifications: {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  user: { findUnique: jest.Mock; update: jest.Mock };
};

describe("Didit Webhook POST", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "webhook-test-secret-123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, DIDIT_WEBHOOK_SECRET: TEST_SECRET };
    mockPrisma.kyc_verifications.updateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const sign = (bodyStr: string, secret: string) => {
    return crypto
      .createHmac("sha256", secret)
      .update(bodyStr, "utf-8")
      .digest("hex");
  };

  const createRequest = (
    body: any,
    options: { secret?: string; rawBody?: string } = {},
  ) => {
    const rawBody =
      options.rawBody !== undefined ? options.rawBody : JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const secret = options.secret !== undefined ? options.secret : TEST_SECRET;
    if (secret) {
      headers["x-signature-v2"] = sign(rawBody, secret);
    }
    return new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers,
      body: rawBody,
    });
  };

  it("returns 401 if x-signature-v2 header is missing when secret is configured", async () => {
    const req = new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "uuid-123", status: "Approved" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 in production if DIDIT_WEBHOOK_SECRET is not configured (fail-closed)", async () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.DIDIT_WEBHOOK_SECRET;

    const req = new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "uuid-123", status: "Approved" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if session_id is missing from all fallback fields", async () => {
    const req = createRequest({ status: "Approved" }); // No id, session_id, session
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("acks user.data.updated without a session_id", async () => {
    const req = createRequest({
      webhook_type: "user.data.updated",
      vendor_data: "673064ec-fc5b-427c-9f73-1e6949746b32",
      changed_fields: ["full_name", "features", "approved_count"],
      status: "ACTIVE",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(mockPrisma.kyc_verifications.findFirst).not.toHaveBeenCalled();
  });

  it("extracts session_id properly from Didit V3 payload (id)", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: "test@test.com" });

    const req = createRequest({
      id: "uuid-123",
      status: "Approved",
      vendorData: "user-1",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "kyc-1", status: { in: ["pending", "resubmitted"] } },
        data: expect.objectContaining({ status: "approved" }),
      }),
    );
  });

  it("extracts session_id properly from nested data (Didit V3)", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: "test@test.com" });

    const req = createRequest({
      data: { id: "uuid-123", status: "Approved", vendorData: "user-1" },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("handles email failure gracefully and returns 200", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: "test@test.com" });

    // Simulate email crash (e.g. localhost)
    (sendKycApprovedEmail as jest.Mock).mockRejectedValue(
      new Error("Email failed"),
    );

    const req = createRequest({
      session_id: "uuid-123",
      status: "Approved",
      vendor_data: "user-1",
    });
    const res = await POST(req);

    // Should still return 200 despite email error
    expect(res.status).toBe(200);
    expect(mockPrisma.kyc_verifications.updateMany).toHaveBeenCalled();
  });

  it("resolves user's account name from profile when kyc full_name is 'Didit User'", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
      full_name: "Didit User",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "jane@example.com",
      fullName: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
    });

    const req = createRequest({
      id: "uuid-123",
      status: "Approved",
      vendorData: "user-1",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(sendKycApprovedEmail).toHaveBeenCalledWith(
      "jane@example.com",
      "Jane Doe",
    );
  });

  it("falls back to 'Refreegerian' brand tone when neither KYC nor profile has a name", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
      full_name: "Didit User",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "anon@example.com",
      fullName: null,
      firstName: null,
      lastName: null,
      displayName: null,
      username: null,
    });

    const req = createRequest({
      id: "uuid-123",
      status: "Approved",
      vendorData: "user-1",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(sendKycApprovedEmail).toHaveBeenCalledWith(
      "anon@example.com",
      "Refreegerian",
    );
  });

  it("notifies admins via sendKycSubmissionAdminNotification when KYC is declined/rejected", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
      full_name: "Test User",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      fullName: "Test User",
    });

    const { sendKycRejectedEmail, sendKycSubmissionAdminNotification } =
      await import("@/services/mail");

    const req = createRequest({
      id: "uuid-456",
      status: "Declined",
      decision_reason: "Document unreadable",
      vendorData: "user-1",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(sendKycRejectedEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Test User",
      "Document unreadable",
    );
    expect(sendKycSubmissionAdminNotification).toHaveBeenCalledWith(
      "user@example.com",
      "Test User",
      "user-1",
      "https://verification.didit.me/admin",
      { isRejected: true, rejectionReason: "Document unreadable" },
    );
  });

  it("looks up the KYC record by session id stored with the ':::' url suffix", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "pending",
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: "test@test.com" });

    await POST(createRequest({ session_id: "uuid-123", status: "Approved" }));

    expect(mockPrisma.kyc_verifications.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { document_url: "uuid-123" },
            { document_url: { startsWith: "uuid-123:::" } },
          ],
        }),
      }),
    );
  });

  it("approves a previously rejected record when a reviewer approves it on Didit", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "rejected",
      full_name: "Judith Daniel",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "judith@example.com",
    });

    const res = await POST(
      createRequest({
        session_id: "uuid-123",
        status: "Approved",
        vendor_data: "user-1",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockPrisma.kyc_verifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "kyc-1" },
        data: expect.objectContaining({ status: "approved" }),
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isVerified: true },
    });
    expect(sendKycApprovedEmail).toHaveBeenCalledWith(
      "judith@example.com",
      "Judith Daniel",
    );
  });

  it("ignores a repeat decline for an already rejected record", async () => {
    mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
      id: "kyc-1",
      user_id: "user-1",
      status: "rejected",
    });

    const res = await POST(
      createRequest({
        session_id: "uuid-123",
        status: "Declined",
        vendor_data: "user-1",
      }),
    );

    expect(await res.json()).toEqual({ message: "Already processed" });
    expect(mockPrisma.kyc_verifications.update).not.toHaveBeenCalled();
  });
});
