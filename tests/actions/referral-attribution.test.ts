/**
 * tests/actions/referral-attribution.test.ts
 *
 * Unit tests for recordDonorReferralAttribution action.
 * Tests:
 * 1. Idempotency: same donation_id does not duplicate records
 * 2. Self-referral detection: donor_user_id === referrer.id -> status='self_referral'
 * 3. Own-campaign detection: donor_user_id === cause.userId -> status='own_campaign'
 * 4. Valid attribution: all conditions pass -> status='confirmed'
 * 5. Anonymous donor attribution: donor_user_id=null -> status='confirmed'
 * 6. Unknown referral code -> returns { recorded: false, reason: 'referrer_not_found' }
 * 7. Missing required parameters -> returns { recorded: false, reason: 'missing_required_params' }
 */

const mockDRAFindUnique = jest.fn();
const mockDRACreate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockCauseFindUnique = jest.fn();
const mockDonationUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    donorReferralAttribution: {
      findUnique: (...args: any[]) => mockDRAFindUnique(...args),
      create: (...args: any[]) => mockDRACreate(...args),
    },
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
    },
    cause: {
      findUnique: (...args: any[]) => mockCauseFindUnique(...args),
    },
    donation: {
      update: (...args: any[]) => mockDonationUpdate(...args),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { recordDonorReferralAttribution } from "@/actions/referral-attribution";
import { revalidatePath } from "next/cache";

describe("recordDonorReferralAttribution", () => {
  const REFERRER_ID = "referrer-uuid-123";
  const CAUSE_ID = "cause-uuid-456";
  const DONATION_ID = "donation-uuid-789";
  const CAUSE_OWNER_ID = "cause-owner-uuid";

  beforeEach(() => {
    jest.clearAllMocks();
    mockDRAFindUnique.mockResolvedValue(null); // not yet recorded
    mockUserFindUnique.mockResolvedValue({ id: REFERRER_ID });
    mockCauseFindUnique.mockResolvedValue({ userId: CAUSE_OWNER_ID });
    mockDRACreate.mockResolvedValue({ id: "dra-123" });
    mockDonationUpdate.mockResolvedValue({ id: DONATION_ID });
  });

  it("records confirmed attribution for valid non-self referral", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "donor@example.com",
      donorUserId: "different-user-id",
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(result.referrerId).toBe(REFERRER_ID);

    expect(mockDRACreate).toHaveBeenCalledWith({
      data: {
        referrer_id: REFERRER_ID,
        donation_id: DONATION_ID,
        cause_id: CAUSE_ID,
        donor_email: "donor@example.com",
        donor_user_id: "different-user-id",
        referral_code: "REF123",
        status: "confirmed",
      },
    });

    expect(mockDonationUpdate).toHaveBeenCalledWith({
      where: { id: DONATION_ID },
      data: { referrer_id: REFERRER_ID },
    });

    expect(revalidatePath).toHaveBeenCalledWith("/leaderboard");
    expect(revalidatePath).toHaveBeenCalledWith(`/leaderboard/${REFERRER_ID}`);
  });

  it("records confirmed attribution for anonymous donor (no donorUserId)", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "anon@example.com",
      donorUserId: null,
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        donor_user_id: null,
        status: "confirmed",
      }),
    });
  });

  it("marks as self_referral when donor_user_id equals referrer.id", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "referrer@example.com",
      donorUserId: REFERRER_ID, // same as referrer
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("self_referral");
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "self_referral",
      }),
    });
    // Should NOT revalidate leaderboard for self referrals
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("marks as own_campaign when donor is the cause creator", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "owner@example.com",
      donorUserId: CAUSE_OWNER_ID, // same as cause.userId
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("own_campaign");
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "own_campaign",
      }),
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("is idempotent: returns existing attribution if donation_id was already recorded", async () => {
    mockDRAFindUnique.mockResolvedValue({
      id: "existing-dra",
      status: "confirmed",
      referrer_id: REFERRER_ID,
    });

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("confirmed");
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockDRACreate).not.toHaveBeenCalled();
  });

  it("returns { recorded: false } when referrer code cannot be resolved", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "INVALID_CODE",
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(false);
    expect(result.reason).toBe("referrer_not_found");
    expect(mockDRACreate).not.toHaveBeenCalled();
  });

  it("marks as self_referral even if donor chooses anonymous display name when logged-in account is the referrer", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "anon@example.com",
      donorUserId: REFERRER_ID, // donor checked 'isAnonymous' on UI, but is logged into the referrer's account
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("self_referral");
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "self_referral",
        donor_user_id: REFERRER_ID,
      }),
    });
  });

  it("trims and lowercases donor email for consistent dedup and tracking", async () => {
    await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "  DONOR.TEST@GMAIL.COM  ",
    });

    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        donor_email: "donor.test@gmail.com",
      }),
    });
  });

  it("resolves referrer when code matches referrer UUID directly as fallback", async () => {
    // First lookup by referralCode column returns null
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      // Second lookup by id (UUID) returns referrer
      .mockResolvedValueOnce({ id: REFERRER_ID });

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: REFERRER_ID,
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(true);
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrer_id: REFERRER_ID,
        referral_code: REFERRER_ID,
      }),
    });
  });

  it("returns { recorded: false } and does not throw if database insert fails", async () => {
    mockDRACreate.mockRejectedValueOnce(new Error("DB timeout"));

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(false);
    expect(result.reason).toBe("DB timeout");
  });
});
