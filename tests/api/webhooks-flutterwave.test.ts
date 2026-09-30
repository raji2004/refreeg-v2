import { createDonation } from "@/actions";
import Flutterwave from "@/services/flutterwave";

jest.mock("next/server", () => ({
  NextResponse: class {
    status: number;
    body: any;
    constructor(body: any, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  },
  NextRequest: class {}
}));

import { POST } from "@/app/api/webhooks/flutterwave/route";

jest.mock("@/actions", () => ({
  createDonation: jest.fn(),
}));

jest.mock("@/services/flutterwave", () => ({
  verifyByReferenceFull: jest.fn(),
}));

jest.mock("@/lib/pledge-provider", () => ({
  processPledgeAuthorizationSuccess: jest.fn(),
  processPledgeScheduledChargeSuccess: jest.fn(),
}));

describe("Flutterwave Webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, FLUTTERWAVE_WEBHOOK_HASH: "secret-hash" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const mockRequest = (body: any, hash: string = "secret-hash") => {
    return {
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      headers: {
        get: (name: string) => name === "verif-hash" ? hash : null
      },
    } as any;
  };

  it("should reject if webhook hash is missing", async () => {
    const req = mockRequest({}, "");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid webhook hash");
  });

  it("should reject if webhook hash is invalid", async () => {
    const req = mockRequest({}, "wrong-hash");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should process charge.completed and create donation", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_123" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      meta: {
        cause_id: "c1",
        user_id: "u1",
        amount: "1000",
        customer_name: "Test",
        email: "test@test.com",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(Flutterwave.verifyByReferenceFull).toHaveBeenCalledWith("flw_123");
    expect(createDonation).toHaveBeenCalledWith(
      "c1",
      "u1",
      expect.objectContaining({
        amount: 1000,
        email: "test@test.com",
      }),
      undefined,
      "flw_123",
      "flutterwave",
      undefined,
    );
  });

  it("should pass meta.ref_v1 to createDonation when present", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_456" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "successful",
      meta: {
        cause_id: "c2",
        user_id: "u2",
        amount: "2500",
        customer_name: "Donor",
        email: "donor@test.com",
        ref_v1: "REF_DONOR_123",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(createDonation).toHaveBeenCalledWith(
      "c2",
      "u2",
      expect.objectContaining({
        amount: 2500,
        email: "donor@test.com",
      }),
      undefined,
      "flw_456",
      "flutterwave",
      "REF_DONOR_123",
    );
  });

  it("should ignore charge.completed if verify fails", async () => {
    const req = mockRequest({
      event: "charge.completed",
      data: { tx_ref: "flw_123" },
    });

    (Flutterwave.verifyByReferenceFull as jest.Mock).mockResolvedValueOnce({
      status: "failed", // Not successful
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createDonation).not.toHaveBeenCalled();
  });
});
