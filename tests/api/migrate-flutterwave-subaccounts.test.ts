import { GET } from "@/app/api/admin/migrate-flutterwave-subaccounts/route";
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

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
};

describe("GET /api/admin/migrate-flutterwave-subaccounts", () => {
  const originalKey = process.env.FLUTTERWAVE_SECRET_KEY;

  beforeEach(() => {
    Flutterwave.api = mockApi as any;
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK-placeholder";
    jest
      .spyOn(Flutterwave, "listBanks")
      .mockResolvedValue([{ name: "Access Bank", code: "044" }]);
    jest.spyOn(Flutterwave, "getBankCode").mockResolvedValue("044");
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    process.env.FLUTTERWAVE_SECRET_KEY = originalKey;
    jest.restoreAllMocks();
  });

  it("saves a recovered subaccount id when the stored number matches after normalisation", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-1",
        email: "ada@example.com",
        accountNumber: " 0123456789",
        bankName: "Access Bank",
        fullName: "Ada Lovelace",
        username: "ada",
        flutterwaveSubAccountId: null,
      },
    ]);
    mockApi.post.mockRejectedValueOnce({
      response: {
        data: {
          message:
            "A subaccount with the account number and bank already exists.",
        },
      },
    });
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [{ account_number: "123456789", subaccount_id: "RS_recovered" }],
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ flutterwaveSubAccountId: null }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { flutterwaveSubAccountId: "RS_recovered" },
    });
    expect(body.results).toEqual([
      expect.objectContaining({
        status: "Success",
        subaccount_id: "RS_recovered",
      }),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("does not create a subaccount for a user who already has a Flutterwave id", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-1",
        email: "ada@example.com",
        accountNumber: "123456789",
        bankName: "Access Bank",
        fullName: "Ada Lovelace",
        username: "ada",
        flutterwaveSubAccountId: "RS_existing",
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(body.results).toEqual([]);
  });
});
