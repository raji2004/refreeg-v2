// Mock next/server before importing the route so Jest doesn't need Next's Web runtime globals.
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: class {},
}));

jest.mock("@/lib/auth/jwt", () => ({
  signMobileToken: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/actions/users/auth-actions", () => ({
  trackLogin: jest.fn(),
  initializeUserWallet: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/mobile/auth/google/route";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { trackLogin } from "@/actions/users/auth-actions";

const TEST_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/mobile/auth/google", () => {
  const originalEnv = process.env.GOOGLE_CLIENT_ID;
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    (trackLogin as jest.Mock).mockResolvedValue(undefined);
    (signMobileToken as jest.Mock).mockResolvedValue("mobile-jwt-token");
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalEnv;
    }
    global.fetch = originalFetch;
  });

  const invalidTokenPayloads: [string, Record<string, unknown>][] = [
    ["missing idToken", {}],
    ["blank idToken", { idToken: "   " }],
  ];

  it.each(invalidTokenPayloads)(
    "returns 400 when %s is provided",
    async (_label, payload) => {
    const res = await POST(makeRequest(payload));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Missing required field (idToken)");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed with 500 when GOOGLE_CLIENT_ID is not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when Google tokeninfo returns a non-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_token" }),
    });

    const res = await POST(makeRequest({ idToken: "bad-token" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid Google ID Token");
  });

  it("rejects tokens with an aud mismatch and encodes idToken in tokeninfo URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: "another-apps-client-id.apps.googleusercontent.com",
        email: "amina@refreeg.com",
        email_verified: "true",
        sub: "google-sub-1",
      }),
    });

    const res = await POST(makeRequest({ idToken: "tok&extra=1" }));
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/tokeninfo?id_token=tok%26extra%3D1",
    );
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid Google ID Token");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  const unverifiedEmailStates: [string, unknown][] = [
    ["boolean false", false],
    ['string "false"', "false"],
    ["undefined", undefined],
  ];

  it.each(unverifiedEmailStates)(
    "returns 401 when email_verified is %s",
    async (_label, emailVerified) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: TEST_CLIENT_ID,
        email: "amina@refreeg.com",
        email_verified: emailVerified,
        sub: "google-sub-1",
      }),
    });

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Google email is not verified");
  });

  it("returns 200 with token and user when aud and email_verified match for existing user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: TEST_CLIENT_ID,
        email: "Amina@Refreeg.com",
        email_verified: "true",
        name: "Amina Bello",
        picture: "https://example.com/amina.jpg",
        sub: "google-sub-1",
      }),
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "amina@refreeg.com",
      fullName: "Amina Bello",
      accountType: "individual",
      profilePhoto: "https://example.com/amina.jpg",
      isVerified: true,
      onboarding_completed: true,
      isBlocked: false,
    });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      id: "account-1",
    });

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      token: "mobile-jwt-token",
      user: {
        id: "user-1",
        email: "amina@refreeg.com",
        fullName: "Amina Bello",
        accountType: "individual",
        profilePhoto: "https://example.com/amina.jpg",
        isVerified: true,
        onboardingCompleted: true,
      },
    });
    expect(signMobileToken).toHaveBeenCalledWith("user-1", "amina@refreeg.com");
  });
});
