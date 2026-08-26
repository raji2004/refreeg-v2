/**
 * tests/lib/paystack-charge-processing.test.ts
 *
 * Unit tests for Paystack charge processing with referral attribution.
 * Verifies that ref_v1 from metadata is extracted and passed to createDonation.
 */

const mockCreateDonation = jest.fn();
const mockVerifyTransactionFull = jest.fn();

jest.mock("@/actions/donation-actions", () => ({
  createDonation: (...args: any[]) => mockCreateDonation(...args),
}));

jest.mock("@/services/payment-provider", () => ({
  verifyTransactionFull: (...args: any[]) => mockVerifyTransactionFull(...args),
}));

jest.mock("@/lib/pledge-provider", () => ({
  processPledgeAuthorizationSuccess: jest.fn(),
  processPledgeScheduledChargeSuccess: jest.fn(),
}));

import { processSuccessfulCharge } from "@/lib/paystack-charge-processing";

describe("Paystack Charge Processing - Referral Attribution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("extracts ref_v1 from Paystack metadata and passes to createDonation", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      metadata: {
        cause_id: "cause-paystack-123",
        user_id: "user-donor-456",
        amount: 5000,
        customer_name: "Paystack Donor",
        email: "donor@paystack.com",
        is_anonymous: false,
        ref_v1: "PAYSTACK_REF_CODE",
      },
    });

    const result = await processSuccessfulCharge("paystack_ref_001");

    expect(result.ok).toBe(true);
    expect(mockCreateDonation).toHaveBeenCalledWith(
      "cause-paystack-123",
      "user-donor-456",
      expect.objectContaining({
        amount: 5000,
        email: "donor@paystack.com",
      }),
      undefined,
      "paystack_ref_001",
      "paystack",
      "PAYSTACK_REF_CODE",
    );
  });

  it("handles missing ref_v1 gracefully in Paystack metadata", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "success",
      metadata: {
        cause_id: "cause-paystack-123",
        amount: 5000,
        email: "donor@paystack.com",
      },
    });

    const result = await processSuccessfulCharge("paystack_ref_002");

    expect(result.ok).toBe(true);
    expect(mockCreateDonation).toHaveBeenCalledWith(
      "cause-paystack-123",
      null,
      expect.objectContaining({
        amount: 5000,
      }),
      undefined,
      "paystack_ref_002",
      "paystack",
      undefined,
    );
  });

  it("returns { ok: false } if Paystack transaction verification fails", async () => {
    mockVerifyTransactionFull.mockResolvedValue({
      status: "failed",
    });

    const result = await processSuccessfulCharge("failed_ref");

    expect(result.ok).toBe(false);
    expect(mockCreateDonation).not.toHaveBeenCalled();
  });
});
