/**
 * @jest-environment node
 */
import { POST } from "@/app/api/webhooks/didit/route";
import { prisma } from "@/lib/prisma";
import { sendKycApprovedEmail } from "@/services/mail";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      update: jest.fn(),
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

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@/actions/kyc-actions", () => ({
  issueReferralRewardOnKycApproval: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  kyc_verifications: { findFirst: jest.Mock; update: jest.Mock };
  user: { findUnique: jest.Mock; update: jest.Mock };
};

describe("Didit Webhook POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: any) =>
    new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    expect(mockPrisma.kyc_verifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
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
    expect(mockPrisma.kyc_verifications.update).toHaveBeenCalled();
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
});
