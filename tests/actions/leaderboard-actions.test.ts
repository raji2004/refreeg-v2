/**
 * tests/actions/leaderboard-actions.test.ts
 *
 * Unit tests for Leaderboard server actions:
 * - getLeaderboard (sorting by donation amount, tie-breaking, pagination, profiles)
 * - getCurrentUserRank (user rank and donation amount lookup)
 * - getReferrerDonorDetail (donor list breakdown with amounts & anonymous protection)
 */

const mockDonationGroupBy = jest.fn();
const mockDonationAggregate = jest.fn();
const mockDonationCount = jest.fn();
const mockDonationFindMany = jest.fn();
const mockUserFindMany = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    donation: {
      groupBy: (...args: any[]) => mockDonationGroupBy(...args),
      aggregate: (...args: any[]) => mockDonationAggregate(...args),
      count: (...args: any[]) => mockDonationCount(...args),
      findMany: (...args: any[]) => mockDonationFindMany(...args),
    },
    user: {
      findMany: (...args: any[]) => mockUserFindMany(...args),
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
    },
  },
}));

import {
  getLeaderboard,
  getCurrentUserRank,
  getReferrerDonorDetail,
} from "@/actions/leaderboard-actions";

describe("leaderboard-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getLeaderboard", () => {
    it("returns ranked leaderboard entries sorted by total amount donated with tie breaking", async () => {
      // Mock grouped aggregation:
      // User 1 has ₦100,000 across 5 donations
      // User 2 has ₦50,000 across 2 donations (earlier date)
      // User 3 has ₦50,000 across 3 donations (later date)
      mockDonationGroupBy
        .mockResolvedValueOnce([
          {
            referrer_id: "user-1",
            _sum: { amount: 100000 },
            _count: { id: 5 },
            _min: { createdAt: new Date("2026-01-01T10:00:00Z") },
          },
          {
            referrer_id: "user-2",
            _sum: { amount: 50000 },
            _count: { id: 2 },
            _min: { createdAt: new Date("2026-01-02T10:00:00Z") },
          },
          {
            referrer_id: "user-3",
            _sum: { amount: 50000 },
            _count: { id: 3 },
            _min: { createdAt: new Date("2026-01-03T10:00:00Z") },
          },
        ])
        .mockResolvedValueOnce([
          { referrer_id: "user-1" },
          { referrer_id: "user-2" },
          { referrer_id: "user-3" },
        ]);

      mockUserFindMany.mockResolvedValue([
        {
          id: "user-1",
          fullName: "Alice Champion",
          username: "alice",
          profilePhoto: "https://example.com/alice.jpg",
          referralCode: "ALICE",
        },
        {
          id: "user-2",
          fullName: "Bob Second",
          username: "bob",
          profilePhoto: null,
          referralCode: "BOB",
        },
        {
          id: "user-3",
          fullName: "Charlie Third",
          username: "charlie",
          profilePhoto: null,
          referralCode: "CHARLIE",
        },
      ]);

      const result = await getLeaderboard({ page: 1, pageSize: 20 });

      expect(result.totalCount).toBe(3);
      expect(result.entries).toHaveLength(3);

      // Rank 1: Alice (₦100,000)
      expect(result.entries[0]).toEqual({
        rank: 1,
        id: "user-1",
        fullName: "Alice Champion",
        username: "alice",
        profilePhoto: "https://example.com/alice.jpg",
        referralCode: "ALICE",
        totalAmountDonated: 100000,
        successfulReferrals: 5,
        firstReferralAt: "2026-01-01T10:00:00.000Z",
      });

      // Rank 2: Bob (₦50,000, earlier first referral)
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[1].fullName).toBe("Bob Second");
      expect(result.entries[1].totalAmountDonated).toBe(50000);
      expect(result.entries[1].successfulReferrals).toBe(2);

      // Rank 3: Charlie (₦50,000, later first referral)
      expect(result.entries[2].rank).toBe(3);
      expect(result.entries[2].fullName).toBe("Charlie Third");
      expect(result.entries[2].totalAmountDonated).toBe(50000);
      expect(result.entries[2].successfulReferrals).toBe(3);
    });

    it("handles empty leaderboard gracefully", async () => {
      mockDonationGroupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await getLeaderboard({ page: 1, pageSize: 20 });

      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("respects pagination offset and rank computation", async () => {
      // Page 2 with pageSize 2 (offset 2)
      mockDonationGroupBy
        .mockResolvedValueOnce([
          {
            referrer_id: "user-3",
            _sum: { amount: 25000 },
            _count: { id: 3 },
            _min: { createdAt: new Date("2026-01-05T00:00:00Z") },
          },
        ])
        .mockResolvedValueOnce([
          { referrer_id: "user-1" },
          { referrer_id: "user-2" },
          { referrer_id: "user-3" },
        ]);

      mockUserFindMany.mockResolvedValue([
        {
          id: "user-3",
          fullName: "User Three",
          username: "u3",
          profilePhoto: null,
          referralCode: "U3",
        },
      ]);

      const result = await getLeaderboard({ page: 2, pageSize: 2 });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].rank).toBe(3);
      expect(result.entries[0].totalAmountDonated).toBe(25000);
      expect(result.totalCount).toBe(3);
    });
  });

  describe("getCurrentUserRank", () => {
    it("returns correct 1-based rank, total amount, and count for user in leaderboard", async () => {
      mockDonationGroupBy.mockResolvedValue([
        { referrer_id: "user-top-1", _sum: { amount: 500000 }, _count: { id: 25 } },
        { referrer_id: "target-user-id", _sum: { amount: 200000 }, _count: { id: 14 } },
        { referrer_id: "user-top-3", _sum: { amount: 80000 }, _count: { id: 8 } },
      ]);

      const result = await getCurrentUserRank("target-user-id");

      expect(result.rank).toBe(2);
      expect(result.totalAmountDonated).toBe(200000);
      expect(result.referralCount).toBe(14);
    });

    it("returns { rank: null, totalAmountDonated: 0, referralCount: 0 } when user has no referrals", async () => {
      mockDonationGroupBy.mockResolvedValue([
        { referrer_id: "other-user", _sum: { amount: 10000 }, _count: { id: 10 } },
      ]);

      const result = await getCurrentUserRank("unranked-user-id");

      expect(result.rank).toBeNull();
      expect(result.totalAmountDonated).toBe(0);
      expect(result.referralCount).toBe(0);
    });

    it("returns { rank: null, totalAmountDonated: 0, referralCount: 0 } when userId is empty", async () => {
      const result = await getCurrentUserRank("");
      expect(result.rank).toBeNull();
    });
  });

  describe("getReferrerDonorDetail", () => {
    it("returns referrer profile and donor list with amount and anonymous masking", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "ref-001",
        fullName: "Top Referrer",
        username: "topref",
        profilePhoto: "https://example.com/top.jpg",
        referralCode: "TOPREF",
      });

      mockDonationCount.mockResolvedValue(2);
      mockDonationAggregate.mockResolvedValue({
        _sum: { amount: 75000 },
      });
      mockDonationFindMany.mockResolvedValue([
        {
          id: "don-1",
          amount: 50000,
          name: "John Public",
          is_anonymous: false,
          createdAt: new Date("2026-01-10T12:00:00Z"),
          cause: { id: "cause-1", title: "Clean Water Project", slug: "clean-water" },
        },
        {
          id: "don-2",
          amount: 25000,
          name: "Secret Donor",
          is_anonymous: true,
          createdAt: new Date("2026-01-11T12:00:00Z"),
          cause: { id: "cause-2", title: "Solar Power School", slug: "solar-school" },
        },
      ]);

      const result = await getReferrerDonorDetail("ref-001");

      expect(result).not.toBeNull();
      expect(result?.referrer.fullName).toBe("Top Referrer");
      expect(result?.referrer.totalAmountDonated).toBe(75000);
      expect(result?.referrer.totalReferrals).toBe(2);
      expect(result?.donations).toHaveLength(2);

      // Public donor
      expect(result?.donations[0].donorName).toBe("John Public");
      expect(result?.donations[0].amount).toBe(50000);
      expect(result?.donations[0].isAnonymous).toBe(false);
      expect(result?.donations[0].cause.title).toBe("Clean Water Project");

      // Anonymous donor is masked
      expect(result?.donations[1].donorName).toBe("Anonymous Donor");
      expect(result?.donations[1].amount).toBe(25000);
      expect(result?.donations[1].isAnonymous).toBe(true);
      expect(result?.donations[1].cause.title).toBe("Solar Power School");
    });

    it("returns null if referrer user does not exist", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await getReferrerDonorDetail("nonexistent-id");

      expect(result).toBeNull();
    });
  });
});
