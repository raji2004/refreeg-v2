/**
 * tests/api/register-pending-utm.test.ts
 *
 * Unit tests for UTM tracking in /api/auth/register-pending.
 * Verifies that utm_source, utm_medium, utm_campaign, user_agent, and ip_address
 * are captured from the request and stored in PendingRegistration.
 *
 * Pattern: mock next/server (same as webhooks-flutterwave.test.ts) to avoid
 * Web Request globals not available in Jest's jsdom environment.
 */

// ── Mock next/server BEFORE importing the route ───────────────────────────────
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: class {},
}));

// ── Mock Prisma ────────────────────────────────────────────────────────────────
const mockUpsert = jest.fn().mockResolvedValue({ id: "pending-id" });
const mockFindUnique = jest.fn().mockResolvedValue(null);

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
    pendingRegistration: { upsert: (...args: any[]) => mockUpsert(...args) },
  },
}));

// ── Mock mail + bcrypt ────────────────────────────────────────────────────────
jest.mock("@/services/mail", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from "@/app/api/auth/register-pending/route";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string | null> = {},
) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
  } as unknown as Request;
}

const baseBody = {
  accountType: "individual",
  fullName: "Test User",
  email: "test@example.com",
  password: "Password1!",
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/auth/register-pending — UTM tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({ id: "pending-id" });
  });

  it("stores utm_source, utm_medium, utm_campaign from request body", async () => {
    const req = makeRequest({
      ...baseBody,
      referralCode: "REF123",
      utm_source: "twitter",
      utm_medium: "social",
      utm_campaign: "summer2026",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.utm_source).toBe("twitter");
    expect(upsertCall.create.utm_medium).toBe("social");
    expect(upsertCall.create.utm_campaign).toBe("summer2026");
    expect(upsertCall.update.utm_source).toBe("twitter");
    expect(upsertCall.update.utm_medium).toBe("social");
    expect(upsertCall.update.utm_campaign).toBe("summer2026");
  });

  it("stores user_agent from request body", async () => {
    const req = makeRequest({
      ...baseBody,
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.user_agent).toBe(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    );
    expect(upsertCall.update.user_agent).toBe(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    );
  });

  it("extracts ip_address from x-forwarded-for header (first IP in chain)", async () => {
    const req = makeRequest(
      { ...baseBody },
      { "x-forwarded-for": "102.89.23.1, 10.0.0.1, 172.16.0.1" }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.ip_address).toBe("102.89.23.1");
    expect(upsertCall.update.ip_address).toBe("102.89.23.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const req = makeRequest(
      { ...baseBody },
      { "x-real-ip": "41.58.120.55" }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.ip_address).toBe("41.58.120.55");
    expect(upsertCall.update.ip_address).toBe("41.58.120.55");
  });

  it("stores null for all UTM fields when none are provided", async () => {
    const req = makeRequest({ ...baseBody });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.utm_source).toBeNull();
    expect(upsertCall.create.utm_medium).toBeNull();
    expect(upsertCall.create.utm_campaign).toBeNull();
    expect(upsertCall.create.user_agent).toBeNull();
    expect(upsertCall.create.ip_address).toBeNull();
  });

  it("normalises empty string UTM values to null", async () => {
    const req = makeRequest({ ...baseBody, utm_source: "", utm_medium: "" });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    // empty string is falsy — stored as null
    expect(upsertCall.create.utm_source).toBeNull();
    expect(upsertCall.create.utm_medium).toBeNull();
  });

  it("stores referralCode alongside UTM fields", async () => {
    const req = makeRequest({
      ...baseBody,
      referralCode: "REF-XYZ",
      utm_source: "whatsapp",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertCall = mockUpsert.mock.calls[0][0];
    expect(upsertCall.create.referralCode).toBe("REF-XYZ");
    expect(upsertCall.create.utm_source).toBe("whatsapp");
  });

  it("returns 409 when user already exists — UTM fields do not affect this check", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-user" });

    const req = makeRequest({ ...baseBody, utm_source: "facebook" });

    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
