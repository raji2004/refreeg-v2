/**
 * @jest-environment node
 */

jest.mock("@/lib/auth/mobile-auth", () => ({
  authenticateMobileRequest: jest.fn(),
}));

import { GET } from "@/app/api/mobile/kyc/session/[sessionId]/route";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { NextRequest } from "next/server";

describe("Mobile KYC Session Route (/api/mobile/kyc/session/[sessionId])", () => {
  const mockUser = {
    id: "user-123",
    email: "session@example.com",
    fullName: "Session User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("returns 401 when unauthenticated", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      errorResponse: new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      ),
    });

    const request = new NextRequest("http://localhost/api/mobile/kyc/session/sess-1");
    const response = await GET(request, { params: Promise.resolve({ sessionId: "sess-1" }) });

    expect(response.status).toBe(401);
  });

  it("returns 403 if vendor_data does not match authenticated user ID", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: "sess-1",
        status: "Approved",
        vendor_data: "other-user-999",
      }),
    });

    const request = new NextRequest("http://localhost/api/mobile/kyc/session/sess-1");
    const response = await GET(request, { params: Promise.resolve({ sessionId: "sess-1" }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Session does not belong to this user");
  });

  it("returns 404 if session is not found in Didit", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });

    const request = new NextRequest("http://localhost/api/mobile/kyc/session/sess-missing");
    const response = await GET(request, { params: Promise.resolve({ sessionId: "sess-missing" }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Session not found");
  });

  it("returns session status when session belongs to authenticated user", async () => {
    (authenticateMobileRequest as jest.Mock).mockResolvedValue({
      user: mockUser,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        session_id: "sess-1",
        status: "Approved",
        vendor_data: "user-123",
        created_at: "2026-07-22T12:00:00Z",
        updated_at: "2026-07-22T12:05:00Z",
      }),
    });

    const request = new NextRequest("http://localhost/api/mobile/kyc/session/sess-1");
    const response = await GET(request, { params: Promise.resolve({ sessionId: "sess-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.session_id).toBe("sess-1");
    expect(data.data.status).toBe("Approved");
  });
});
