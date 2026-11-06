import Flutterwave from "@/services/flutterwave";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a mock instance for axios.create
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
};

// @ts-ignore
mockedAxios.create.mockReturnValue(mockAxiosInstance);

// Redefine Flutterwave.api since the module already instantiated it before our mock took effect
Flutterwave.api = mockAxiosInstance as any;

describe("Flutterwave Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializeTransaction", () => {
    it("should call flutterwave payments endpoint and map the response", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            link: "https://checkout.flutterwave.com/v3/hosted/pay/123",
          },
        },
      });

      const data = {
        amount: 1000,
        serviceFee: 15,
        tipAmount: 0,
        email: "test@example.com",
        causeId: "cause_1",
        full_name: "Test User",
        message: "Hello",
        isAnonymous: false,
        subaccounts: [{ subaccount: "RS_123", share: 100000 }],
      };

      const result = await Flutterwave.initializeTransaction(data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/payments",
        expect.objectContaining({
          amount: 1015,
          currency: "NGN",
          customer: {
            email: "test@example.com",
            name: "Test User",
          },
          subaccounts: [
            {
              id: "RS_123",
              transaction_charge_type: "flat",
              transaction_charge: 15,
            },
          ],
        }),
      );
      expect(result.authorization_url).toBe(
        "https://checkout.flutterwave.com/v3/hosted/pay/123",
      );
      expect(result.reference).toContain("flw_");
    });
  });

  describe("verifyTransaction", () => {
    it("should return true if status is successful", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: { status: "successful" } },
      });

      const result = await Flutterwave.verifyTransaction("12345");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/transactions/12345/verify",
      );
      expect(result).toBe(true);
    });
  });

  describe("verifyByReferenceFull", () => {
    it("encodes the reference and returns the transaction", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: { status: "successful", id: 9 } },
      });

      const result = await Flutterwave.verifyByReferenceFull("flw 1&2");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/transactions/verify_by_reference?tx_ref=flw%201%262",
      );
      expect(result).toEqual({ status: "successful", id: 9 });
    });

    it.each([400, 404])(
      "returns null when Flutterwave answers %s",
      async (status) => {
        mockAxiosInstance.get.mockRejectedValueOnce({
          response: { status, data: { message: "No transaction" } },
          message: `Request failed with status code ${status}`,
        });

        await expect(
          Flutterwave.verifyByReferenceFull("flw_cancelled"),
        ).resolves.toBeNull();
      },
    );

    it("rethrows a 401", async () => {
      const error = {
        response: { status: 401 },
        message: "Request failed with status code 401",
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(
        Flutterwave.verifyByReferenceFull("flw_cancelled"),
      ).rejects.toBe(error);
    });

    it("rethrows a network failure", async () => {
      const error = new Error("Network Error");
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(
        Flutterwave.verifyByReferenceFull("flw_cancelled"),
      ).rejects.toBe(error);
    });
  });

  describe("createSubaccount", () => {
    it("should call subaccounts endpoint with correct data", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { data: { subaccount_id: "RS_456" } },
      });

      const result = await Flutterwave.createSubaccount({
        account_number: "0690000031",
        bank_code: "044",
        business_name: "Test Cause",
        percentage_charge: 0,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/subaccounts", {
        account_bank: "044",
        account_number: "0690000031",
        business_name: "Test Cause",
        business_email: "no-reply@refreeg.com",
        country: "NG",
      });
      expect(result.subaccount_id).toBe("RS_456");
    });

    it("recovers an existing subaccount when the account number differs by spaces or leading zeros", async () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            message:
              "A subaccount with the account number and bank already exists.",
          },
        },
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ account_number: "123456789", subaccount_id: "RS_existing" }],
        },
      });

      const result = await Flutterwave.createSubaccount({
        account_number: " 0123456789",
        bank_code: "044",
        business_name: "Test Cause",
        percentage_charge: 0,
      });

      expect(result).toEqual({
        subaccount_id: "RS_existing",
        account_number: " 0123456789",
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/subaccounts?limit=100&page=1",
      );
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns only when an existing subaccount cannot be recovered", async () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            message:
              "A subaccount with the account number and bank already exists.",
          },
        },
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ account_number: "9999999999", subaccount_id: "RS_other" }],
        },
      });

      await expect(
        Flutterwave.createSubaccount({
          account_number: " 0123456789",
          bank_code: "044",
          business_name: "Test Cause",
          percentage_charge: 0,
        }),
      ).rejects.toBeTruthy();

      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
