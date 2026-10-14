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
  const REFERRER_UUID = "3f2b8c1e-9a4d-4e7b-8c55-1d2e3f4a5b6c";
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
      donorUserId: REFERRER_ID,
    });

    expect(result.recorded).toBe(true);
    expect(result.status).toBe("self_referral");
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "self_referral",
      }),
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("marks as own_campaign when donor is the cause creator", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "owner@example.com",
      donorUserId: CAUSE_OWNER_ID,
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
      donorUserId: REFERRER_ID,
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

  it("resolves referrer by referralCode column without any fallback lookup", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "REF123",
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(true);
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { referralCode: "REF123" },
      select: { id: true },
    });
  });

  it("resolves referrer by username when referralCode misses and code is not a UUID", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: REFERRER_ID });

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "lumina_nn",
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(true);
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
    expect(mockUserFindUnique).toHaveBeenNthCalledWith(2, {
      where: { username: "lumina_nn" },
      select: { id: true },
    });
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrer_id: REFERRER_ID,
        referral_code: "lumina_nn",
      }),
    });
  });

  it("resolves referrer by UUID id when referralCode misses, without a username lookup", async () => {
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: REFERRER_UUID });

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: REFERRER_UUID,
      donorEmail: "donor@example.com",
    });

    expect(result.recorded).toBe(true);
    expect(result.referrerId).toBe(REFERRER_UUID);
    expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
    expect(mockUserFindUnique).toHaveBeenNthCalledWith(2, {
      where: { id: REFERRER_UUID },
      select: { id: true },
    });
    expect(
      mockUserFindUnique.mock.calls.find((c: any) => c[0]?.where?.username),
    ).toBeUndefined();
    expect(mockDRACreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrer_id: REFERRER_UUID,
        referral_code: REFERRER_UUID,
      }),
    });
  });

  it("returns referrer_not_found for a non-UUID code that matches nothing, without an id lookup", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "lumina_nn",
      donorEmail: "donor@example.com",
    });

    expect(result).toEqual({ recorded: false, reason: "referrer_not_found" });
    expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
    expect(
      mockUserFindUnique.mock.calls.find((c: any) => c[0]?.where?.id),
    ).toBeUndefined();
    expect(mockDRACreate).not.toHaveBeenCalled();
  });

  it("returns referrer_not_found for a UUID code that matches nothing, without a username lookup", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: REFERRER_UUID,
      donorEmail: "donor@example.com",
    });

    expect(result).toEqual({ recorded: false, reason: "referrer_not_found" });
    expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
    expect(
      mockUserFindUnique.mock.calls.find((c: any) => c[0]?.where?.username),
    ).toBeUndefined();
    expect(mockDRACreate).not.toHaveBeenCalled();
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

  it("returns { recorded: false } when required params are missing", async () => {
    const result = await recordDonorReferralAttribution({
      donationId: DONATION_ID,
      causeId: CAUSE_ID,
      referralCode: "",
      donorEmail: "donor@example.com",
    });

    expect(result).toEqual({
      recorded: false,
      reason: "missing_required_params",
    });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
