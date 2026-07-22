/**
 * @jest-environment node
 */

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/mobile/kyc/legacy/route";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

describe("Legacy Mobile KYC Route (/api/mobile/kyc/legacy)", () => {
  const mockUser = {
    id: "user-123",
    email: "legacy@example.com",
    fullName: "Legacy User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      errorResponse: new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      ),
    });

    const request = new NextRequest("http://localhost/api/mobile/kyc/legacy");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns has_legacy_kyc: false when user has no manual/legacy record", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/mobile/kyc/legacy");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.has_legacy_kyc).toBe(false);
    expect(data.data.verification).toBeNull();
  });

  it("returns has_legacy_kyc: true and record when manual KYC exists", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    const mockLegacyRecord = {
      id: "legacy-kyc-1",
      status: "approved",
      document_type: "passport",
      full_name: "Legacy User",
      dob: "1990-01-01",
      phone: "+1234567890",
      address: "123 Main St",
      city: "Lagos",
      state: "Lagos",
      postal: "100001",
      country: "Nigeria",
      verification_notes: "Approved manually",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (prisma.kyc_verifications.findFirst as jest.Mock).mockResolvedValue(mockLegacyRecord);

    const request = new NextRequest("http://localhost/api/mobile/kyc/legacy");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.has_legacy_kyc).toBe(true);
    expect(data.data.verification.document_type).toBe("passport");
    expect(data.data.verification.full_name).toBe("Legacy User");

    // Check Prisma query filtered out "didit"
    expect(prisma.kyc_verifications.findFirst).toHaveBeenCalledWith({
      where: {
        user_id: "user-123",
        document_type: { not: "didit" },
      },
      orderBy: { created_at: "desc" },
      select: expect.any(Object),
    });
  });
});
