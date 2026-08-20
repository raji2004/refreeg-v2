/**
 * tests/api/payments-initialize-referral.test.ts
 *
 * Tests for referral code propagation in /api/payments/initialize.
 */

// ── Mock next/server ─────────────────────────────────────────────────────────
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

const mockInitializeTransaction = jest.fn();
jest.mock("@/services/payment-provider", () => ({
  initializeTransaction: (...args: any[]) => mockInitializeTransaction(...args),
}));

jest.mock("@/lib/proof-milestones", () => ({
  assertCauseAcceptingDonations: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/utils", () => ({
  calculateServiceFee: jest.fn().mockReturnValue(100),
  calculateProviderFee: jest.fn().mockReturnValue(50),
}));

import { POST } from "@/app/api/payments/initialize/route";

function makeInitRequest(
  body: Record<string, unknown>,
  cookieRefV1?: string,
) {
  return {
    json: jest.fn().mockResolvedValue({ ...body }),
    cookies: {
      get: (name: string) =>
        name === "ref_v1" && cookieRefV1 ? { value: cookieRefV1 } : undefined,
    },
  } as any;
}

describe("POST /api/payments/initialize - Referral code propagation", () => {
  const basePayload = {
    amount: 1000,
    email: "donor@example.com",
    causeId: "cause-123",
    paymentProvider: "paystack",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeTransaction.mockResolvedValue({
      authorization_url: "https://paystack.com/pay/abc",
      reference: "ref_123",
    });
  });

  it("extracts ref_v1 from cookie and attaches to transaction data as referrer_code", async () => {
    const req = makeInitRequest(basePayload, "REF_FROM_COOKIE");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockInitializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer_code: "REF_FROM_COOKIE",
      }),
      "paystack",
    );
  });

  it("preserves explicit referrer_code in payload if present", async () => {
    const req = makeInitRequest(
      { ...basePayload, referrer_code: "EXPLICIT_REF" },
      "COOKIE_REF",
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockInitializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer_code: "EXPLICIT_REF",
      }),
      "paystack",
    );
  });

  it("leaves referrer_code undefined if neither cookie nor payload has ref_v1", async () => {
    const req = makeInitRequest(basePayload);
    const res = await POST(req);

    const calledData = mockInitializeTransaction.mock.calls[0][0];
    expect(calledData.referrer_code).toBeUndefined();
  });
});
