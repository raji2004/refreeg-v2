import { POST } from "@/app/api/payments/verify/route";
import Flutterwave from "@/services/flutterwave";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => {
      return {
        json: async () => body,
        status: init?.status || 200,
      };
    }),
  },
}));

jest.mock("@/services/paystack", () => ({
  __esModule: true,
  default: { verifyTransaction: jest.fn() },
}));

jest.mock("@/lib/paystack-charge-processing", () => ({
  processSuccessfulCharge: jest.fn(),
}));

const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
};

Flutterwave.api = mockApi as any;

function verifyRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

describe("POST /api/payments/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns verified false when a cancelled Flutterwave reference has no transaction", async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 400, data: { message: "No transaction" } },
      message: "Request failed with status code 400",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
    expect(mockApi.get).toHaveBeenCalledWith(
      "/transactions/verify_by_reference?tx_ref=flw_cancelled",
    );
  });

  it("returns verified false when Flutterwave answers 404", async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 404 },
      message: "Request failed with status code 404",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_missing",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
  });

  it("returns verified false when the transaction exists but was not successful", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { status: "failed", id: 4 } },
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_failed",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, verified: false });
  });

  it("returns 500 when Flutterwave rejects the key", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockRejectedValueOnce({
      response: { status: 401 },
      message: "Request failed with status code 401",
    });

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Request failed with status code 401",
      success: false,
    });
    errorSpy.mockRestore();
  });

  it("returns 500 when Flutterwave cannot be reached", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockApi.get.mockRejectedValueOnce(new Error("Network Error"));

    const response = await POST(
      verifyRequest({
        reference: "flw_cancelled",
        provider: "flutterwave",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Network Error",
      success: false,
    });
    errorSpy.mockRestore();
  });
});
