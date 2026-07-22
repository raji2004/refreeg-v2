/**
 * @jest-environment node
 */

import crypto from "crypto";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/actions/kyc-actions", () => ({
  issueReferralRewardOnKycApproval: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendKycSubmittedEmail: jest.fn(),
  sendKycApprovedEmail: jest.fn(),
  sendKycRejectedEmail: jest.fn(),
  sendKycSubmissionAdminNotification: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { POST } from "@/app/api/webhooks/didit/route";
import { prisma } from "@/lib/prisma";
import { issueReferralRewardOnKycApproval } from "@/actions/kyc-actions";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/services/mail";

describe("Didit Webhook Route (/api/webhooks/didit)", () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...oldEnv, DIDIT_WEBHOOK_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  function createSignedRequest(body: object, secret = "test-secret"): Request {
    const rawBody = JSON.stringify(body);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf-8")
      .digest("hex");

    return new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature-v2": signature,
      },
      body: rawBody,
    });
  }

  it("returns 401 if X-Signature-V2 header is missing", async () => {
    const request = new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      body: JSON.stringify({ session_id: "sess-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Invalid webhook signature");
  });

  it("returns 401 if X-Signature-V2 header is invalid", async () => {
    const request = new Request("http://localhost/api/webhooks/didit", {
      method: "POST",
      headers: {
        "x-signature-v2": "invalid-hex-signature-1234567890123456789012345678901234567890123456789012345678901234",
      },
      body: JSON.stringify({ session_id: "sess-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("processes Approved webhook successfully and triggers user verification & emails", async () => {
    const payload = {
      session_id: "sess-approved-123",
      status: "Approved",
      vendor_data: "user-456",
    };

    (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue({
      id: "kyc-123",
      user_id: "user-456",
      status: "pending",
      full_name: "John Approved",
    });

    (prisma.kyc_verifications.update as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-456",
      email: "approved@example.com",
    });

    const request = createSignedRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify KYC status updated to approved
    expect(prisma.kyc_verifications.update).toHaveBeenCalledWith({
      where: { id: "kyc-123" },
      data: expect.objectContaining({
        status: "approved",
      }),
    });

    // Verify user record updated to isVerified: true
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-456" },
      data: { isVerified: true },
    });

    // Verify email & rewards triggered
    expect(sendKycApprovedEmail).toHaveBeenCalledWith("approved@example.com", "John Approved");
    expect(issueReferralRewardOnKycApproval).toHaveBeenCalledWith("user-456");
  });

  it("processes Declined webhook successfully and triggers rejection email", async () => {
    const payload = {
      session_id: "sess-declined-123",
      status: "Declined",
      vendor_data: "user-789",
      decision_reason: "Blurry document",
    };

    (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue({
      id: "kyc-789",
      user_id: "user-789",
      status: "pending",
      full_name: "Jane Declined",
    });

    (prisma.kyc_verifications.update as jest.Mock).mockResolvedValue({});
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-789",
      email: "declined@example.com",
    });

    const request = createSignedRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify KYC status updated to rejected
    expect(prisma.kyc_verifications.update).toHaveBeenCalledWith({
      where: { id: "kyc-789" },
      data: expect.objectContaining({
        status: "rejected",
      }),
    });

    // Verify user remains unverified
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-789" },
      data: { isVerified: false },
    });

    // Verify rejection email sent with reason
    expect(sendKycRejectedEmail).toHaveBeenCalledWith(
      "declined@example.com",
      "Jane Declined",
      "Blurry document"
    );
  });
});
