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
});
