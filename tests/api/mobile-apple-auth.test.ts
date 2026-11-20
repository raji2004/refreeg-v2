import { createHash } from "crypto";

// Mock jose before importing the route because jose v6 ships ESM-only modules.
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(() => "mock-apple-jwks"),
  jwtVerify: jest.fn(),
}));

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
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/actions/users/auth-actions", () => ({
  trackLogin: jest.fn(),
  initializeUserWallet: jest.fn(),
}));

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { POST } from "@/app/api/mobile/auth/apple/route";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { trackLogin, initializeUserWallet } from "@/actions/users/auth-actions";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/mobile/auth/apple", () => {
  const originalMobileAudience = process.env.APPLE_MOBILE_CLIENT_ID;
  const originalWebAudience = process.env.APPLE_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.APPLE_MOBILE_CLIENT_ID;
    delete process.env.APPLE_ID;
    (trackLogin as jest.Mock).mockResolvedValue(undefined);
    (initializeUserWallet as jest.Mock).mockResolvedValue(undefined);
    (signMobileToken as jest.Mock).mockResolvedValue("mobile-apple-jwt");
  });

  afterEach(() => {
    if (originalMobileAudience === undefined) {
      delete process.env.APPLE_MOBILE_CLIENT_ID;
    } else {
      process.env.APPLE_MOBILE_CLIENT_ID = originalMobileAudience;
    }
    if (originalWebAudience === undefined) {
      delete process.env.APPLE_ID;
    } else {
      process.env.APPLE_ID = originalWebAudience;
    }
  });

  const invalidIdentityPayloads: [string, Record<string, unknown>][] = [
    ["missing identityToken", {}],
    ["blank identityToken", { identityToken: "   " }],
  ];

  it.each(invalidIdentityPayloads)(
    "returns 400 when %s is provided",
    async (_label, payload) => {
      const res = await POST(makeRequest(payload));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Missing required field (identityToken)");
      expect(jwtVerify).not.toHaveBeenCalled();
    },
  );

  it("returns 401 when jwtVerify rejects the Apple identity token", async () => {
    (jwtVerify as jest.Mock).mockRejectedValue(new Error("invalid signature"));

    const res = await POST(makeRequest({ identityToken: "bad-apple-token" }));
    const body = await res.json();

    expect(jwtVerify).toHaveBeenCalledWith(
      "bad-apple-token",
      "mock-apple-jwks",
      {
        issuer: "https://appleid.apple.com",
        audience: ["com.refreeg.app"],
      },
    );
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid Apple identity token");
  });

  const invalidNonceCases: [string, string | undefined, string | undefined][] = [
    ["nonce mismatches token digest", sha256Hex("expected-nonce"), "wrong-nonce"],
    ["body nonce is missing when token carries nonce", sha256Hex("expected-nonce"), undefined],
  ];

  it.each(invalidNonceCases)(
    "returns 401 when %s",
    async (_label, tokenNonce, rawNonce) => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          sub: "apple-sub-1",
          nonce: tokenNonce,
          email: "amina@privaterelay.appleid.com",
          email_verified: true,
        },
      });

      const res = await POST(
        makeRequest({
          identityToken: "valid-token",
          ...(rawNonce !== undefined ? { nonce: rawNonce } : {}),
        }),
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid Apple sign-in nonce");
      expect(prisma.account.findFirst).not.toHaveBeenCalled();
    },
  );

  it("returns 200 for a returning Apple user even when payload email is omitted", async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: "apple-sub-returning",
        nonce: sha256Hex("raw-nonce-1"),
      },
    });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      id: "account-apple-1",
      user: {
        id: "user-apple-1",
        email: "amina@privaterelay.appleid.com",
        fullName: "Amina Bello",
        accountType: "individual",
        profilePhoto: null,
        isVerified: true,
        onboarding_completed: true,
        isBlocked: false,
      },
    });

    const res = await POST(
      makeRequest({
        identityToken: "valid-token",
        nonce: "raw-nonce-1",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      token: "mobile-apple-jwt",
      user: {
        id: "user-apple-1",
        email: "amina@privaterelay.appleid.com",
        fullName: "Amina Bello",
        accountType: "individual",
        profilePhoto: null,
        isVerified: true,
        onboardingCompleted: true,
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(signMobileToken).toHaveBeenCalledWith(
      "user-apple-1",
      "amina@privaterelay.appleid.com",
    );
  });

  it("creates user, links Apple account, and initializes wallet for first-time Apple sign-in", async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: "apple-sub-new",
        nonce: sha256Hex("raw-nonce-2"),
        email: "NewUser@PrivateRelay.AppleID.com",
        email_verified: "true",
      },
    });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: "user-new-1",
      email: "newuser@privaterelay.appleid.com",
      fullName: "Amina Bello",
      accountType: "individual",
      profilePhoto: null,
      isVerified: false,
      onboarding_completed: false,
      isBlocked: false,
    });

    const res = await POST(
      makeRequest({
        identityToken: "valid-token",
        nonce: "raw-nonce-2",
        fullName: "Amina Bello",
        accountType: "individual",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "newuser@privaterelay.appleid.com",
        fullName: "Amina Bello",
        accountType: "individual",
        isVerified: false,
        onboarding_completed: false,
      },
    });
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        userId: "user-new-1",
        type: "oauth",
        provider: "apple",
        providerAccountId: "apple-sub-new",
      },
    });
    expect(initializeUserWallet).toHaveBeenCalledWith("user-new-1");
  });

  const unverifiedEmailStates: [string, unknown][] = [
    ["boolean false", false],
    ['string "false"', "false"],
    ["undefined", undefined],
  ];

  it.each(unverifiedEmailStates)(
    "returns 401 for first-time Apple user when email_verified is %s",
    async (_label, emailVerified) => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          sub: "apple-sub-unverified",
          email: "amina@privaterelay.appleid.com",
          email_verified: emailVerified,
        },
      });
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await POST(makeRequest({ identityToken: "valid-token" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Apple email is not verified");
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it("returns 403 when the matched Apple user is blocked", async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: "apple-sub-blocked",
      },
    });
    (prisma.account.findFirst as jest.Mock).mockResolvedValue({
      id: "account-blocked",
      user: {
        id: "user-blocked",
        email: "blocked@privaterelay.appleid.com",
        fullName: "Blocked User",
        accountType: "individual",
        profilePhoto: null,
        isVerified: true,
        onboarding_completed: true,
        isBlocked: true,
      },
    });

    const res = await POST(makeRequest({ identityToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Your account has been blocked");
    expect(signMobileToken).not.toHaveBeenCalled();
  });
});
