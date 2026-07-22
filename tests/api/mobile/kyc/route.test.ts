/**
 * @jest-environment node
 */

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

jest.mock("@/actions/kyc-actions", () => ({
  getVerificationStatus: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/mobile/kyc/route";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getVerificationStatus } from "@/actions/kyc-actions";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

describe("Mobile KYC Route (/api/mobile/kyc)", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    fullName: "Test User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe("GET /api/mobile/kyc", () => {
    it("returns 401 if request is unauthenticated", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        errorResponse: new Response(
          JSON.stringify({ success: false, error: "Missing or invalid authorization header" }),
          { status: 401 }
        ),
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Missing or invalid authorization header");
    });

    it("returns 200 with status when authenticated", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (getVerificationStatus as jest.Mock).mockResolvedValue({
        status: {
          id: "kyc-1",
          status: "approved",
          document_type: "didit",
        },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        headers: { authorization: "Bearer valid-token" },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status.status).toBe("approved");
      expect(getVerificationStatus).toHaveBeenCalledWith("user-123");
    });
  });

  describe("POST /api/mobile/kyc", () => {
    it("returns 401 if unauthenticated", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        errorResponse: new Response(
          JSON.stringify({ success: false, error: "Invalid token" }),
          { status: 401 }
        ),
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 409 if user already has an approved KYC", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue({
        id: "kyc-approved",
        status: "approved",
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("KYC already approved");
    });

    it("returns 409 if user already has a pending KYC", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue({
        id: "kyc-pending",
        status: "pending",
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already in progress");
    });

    it("creates Didit session successfully and returns session_id and verification_url", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          session_id: "didit-session-999",
          url: "https://verification.didit.me/v3/session/didit-session-999",
        }),
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
        body: JSON.stringify({ callback_url: "custom://callback" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.session_id).toBe("didit-session-999");
      expect(data.data.verification_url).toBe(
        "https://verification.didit.me/v3/session/didit-session-999"
      );

      // Verify fetch was called with correct payload
      expect(global.fetch).toHaveBeenCalledWith(
        "https://verification.didit.me/v3/session/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            workflow_id: process.env.DIDIT_WORKFLOW_ID || "",
            callback: "custom://callback",
            vendor_data: "user-123",
          }),
        })
      );
    });

    it("returns 502 when Didit API fails", async () => {
      (authenticateMobileRequest as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: async () => "Internal Didit Error",
      });

      const request = new NextRequest("http://localhost/api/mobile/kyc", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.error).toBe("Failed to create verification session");
    });
  });
});
