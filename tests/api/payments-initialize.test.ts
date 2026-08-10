
import { POST } from "@/app/api/payments/initialize/route";
import { prisma } from "@/lib/prisma";
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

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/services/flutterwave", () => ({
  __esModule: true,
  default: {
    listBanks: jest.fn(),
    createSubaccount: jest.fn(),
    initializeTransaction: jest.fn().mockResolvedValue({ status: "success", data: "test" }),
  },
}));

jest.mock("@/services/payment-provider", () => ({
  initializeTransaction: jest.fn().mockResolvedValue({ status: "success", data: "provider-test" }),
}));

describe("POST /api/payments/initialize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should perform JIT Flutterwave subaccount creation for existing users with valid bank details", async () => {
    // Setup mocks
    (prisma.cause.findUnique as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      accountNumber: "1234567890",
      bankName: "Access Bank",
      fullName: "Test User",
      subAccountCode: "ACCT_paystack123",
      flutterwaveSubAccountId: null, // Missing Flutterwave subaccount
    });

    (Flutterwave.listBanks as jest.Mock).mockResolvedValue([
      { name: "Access Bank Plc", code: "044" },
      { name: "UBA", code: "033" },
    ]);

    (Flutterwave.createSubaccount as jest.Mock).mockResolvedValue({
      subaccount_id: "RS_flutterwave123",
    });

    // Create request payload without subaccounts
    const payload = {
      amount: 5000,
      email: "test@example.com",
      causeId: "cause-123",
      paymentProvider: "flutterwave",
      subaccounts: [],
    };

    const req = {
      json: jest.fn().mockResolvedValue(payload),
    } as any;

    // Execute route
    const res = await POST(req);
    const json = await res.json();

    // Verify JIT steps were executed
    expect(prisma.cause.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cause-123" } })
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-123" } })
    );
    expect(Flutterwave.listBanks).toHaveBeenCalled();
    expect(Flutterwave.createSubaccount).toHaveBeenCalledWith(
      expect.objectContaining({
        account_number: "1234567890",
        bank_code: "044", // Resolved successfully
        business_name: "Test User",
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-123" },
        data: { flutterwaveSubAccountId: "RS_flutterwave123" },
      })
    );

    expect(json.success).toBe(true);
  });

  it("should NOT perform JIT creation if subaccount already provided", async () => {
    const payload = {
      amount: 5000,
      email: "test@example.com",
      causeId: "cause-123",
      paymentProvider: "flutterwave",
      subaccounts: [{ subaccount: "RS_existing123", share: 500000 }],
    };

    const req = {
      json: jest.fn().mockResolvedValue(payload),
    } as any;

    await POST(req);

    // Verify no DB queries were made for JIT
    expect(prisma.cause.findUnique).not.toHaveBeenCalled();
    expect(Flutterwave.createSubaccount).not.toHaveBeenCalled();
  });
});
