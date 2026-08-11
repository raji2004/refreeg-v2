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
        })
      );
      expect(result.authorization_url).toBe(
        "https://checkout.flutterwave.com/v3/hosted/pay/123"
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
        "/transactions/12345/verify"
      );
      expect(result).toBe(true);
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
        split_type: "percentage",
        split_value: 0,
        country: "NG",
      });
      expect(result.subaccount_id).toBe("RS_456");
    });
  });
});
