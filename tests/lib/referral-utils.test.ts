/**
 * tests/lib/referral-utils.test.ts
 *
 * Unit tests for the shared createReferralRecord utility.
 * This function is used by both the OTP signup path and the Google OAuth path.
 */

// ── Mock Prisma ────────────────────────────────────────────────────────────────
const mockUserFindUnique = jest.fn();
const mockReferralsV1FindFirst = jest.fn();
const mockReferralsV1Create = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
    referrals_v1: {
      findFirst: (...args: any[]) => mockReferralsV1FindFirst(...args),
      create: (...args: any[]) => mockReferralsV1Create(...args),
    },
  },
}));

import { createReferralRecord } from "@/lib/referral-utils";

const REFERRER_ID = "referrer-user-id";
const NEW_USER_ID = "new-user-id";
const REFERRAL_CODE = "REF123";

describe("createReferralRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: referrer found by referralCode, no existing record
    mockUserFindUnique.mockResolvedValue({ id: REFERRER_ID });
    mockReferralsV1FindFirst.mockResolvedValue(null);
    mockReferralsV1Create.mockResolvedValue({ id_v1: "new-referral-id" });
  });

  it("creates a referrals_v1 row and returns { created: true, referrerId }", async () => {
    const result = await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });

    expect(result.created).toBe(true);
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockReferralsV1Create).toHaveBeenCalledTimes(1);
    const createArg = mockReferralsV1Create.mock.calls[0][0].data;
    expect(createArg.referrer_id_v1).toBe(REFERRER_ID);
    expect(createArg.referee_id_v1).toBe(NEW_USER_ID);
    expect(createArg.registered_v1).toBe(true);
    expect(createArg.reward_status_v1).toBe("PENDING");
    expect(createArg.kyc_verified_v1).toBe(false);
  });

  it("passes UTM fields through to the created row", async () => {
    await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
      utmFields: {
        utm_source: "twitter",
        utm_medium: "social",
        utm_campaign: "launch",
        ip_address: "102.89.23.1",
        user_agent: "Mozilla/5.0",
      },
    });

    const createArg = mockReferralsV1Create.mock.calls[0][0].data;
    expect(createArg.utm_source_v1).toBe("twitter");
    expect(createArg.utm_medium_v1).toBe("social");
    expect(createArg.utm_campaign_v1).toBe("launch");
    expect(createArg.ip_address_v1).toBe("102.89.23.1");
    expect(createArg.user_agent_v1).toBe("Mozilla/5.0");
  });

  it("stores null for UTM fields when none are provided (OAuth path)", async () => {
    await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
      // no utmFields
    });

    const createArg = mockReferralsV1Create.mock.calls[0][0].data;
    expect(createArg.utm_source_v1).toBeNull();
    expect(createArg.utm_medium_v1).toBeNull();
    expect(createArg.utm_campaign_v1).toBeNull();
    expect(createArg.ip_address_v1).toBeNull();
    expect(createArg.user_agent_v1).toBeNull();
  });

  it("returns { created: false } for unknown referral code", async () => {
    mockUserFindUnique.mockResolvedValue(null); // not found by referralCode or id

    const result = await createReferralRecord({
      referralCode: "INVALID_CODE",
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });

    expect(result.created).toBe(false);
    expect(result.referrerId).toBeUndefined();
    expect(mockReferralsV1Create).not.toHaveBeenCalled();
  });

  it("falls back to user ID lookup when referralCode field doesn't match", async () => {
    // First call (by referralCode field) returns null, second call (by id) returns referrer
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: REFERRER_ID });

    const result = await createReferralRecord({
      referralCode: REFERRER_ID, // passing raw UUID as code
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });

    expect(result.created).toBe(true);
    expect(mockReferralsV1Create).toHaveBeenCalledTimes(1);
  });

  it("blocks self-referral: referrer and new user are the same person", async () => {
    mockUserFindUnique.mockResolvedValue({ id: NEW_USER_ID }); // same as newUserId

    const result = await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "self@example.com",
    });

    expect(result.created).toBe(false);
    expect(mockReferralsV1Create).not.toHaveBeenCalled();
  });

  it("is idempotent: returns { created: false } if record already exists for this pair", async () => {
    mockReferralsV1FindFirst.mockResolvedValue({ id_v1: "existing-referral" });

    const result = await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });

    expect(result.created).toBe(false);
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockReferralsV1Create).not.toHaveBeenCalled();
  });

  it("returns { created: false } and does not throw when DB create fails", async () => {
    mockReferralsV1Create.mockRejectedValue(new Error("DB connection lost"));

    const result = await createReferralRecord({
      referralCode: REFERRAL_CODE,
      newUserId: NEW_USER_ID,
      email: "newuser@example.com",
    });

    expect(result.created).toBe(false);
    // Should NOT throw
  });
});
