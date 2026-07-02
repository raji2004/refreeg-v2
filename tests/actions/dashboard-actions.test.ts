jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    donation: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    petitions: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    signatures: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getDashboardStats,
  getDonationTrends,
  getUserCauses,
  getUserCausesWithStats,
  getUserPetitionsWithStats,
  getCauseAnalytics,
  getPetitionDashboardStats,
  getPetitionSignatureTrends,
  getUserPetitions,
  getPetitionAnalytics,
} from "@/actions/dashboard-actions";

const mockPrisma = prisma as unknown as {
  cause: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  donation: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
  petitions: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  signatures: {
    aggregate: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
};

const validUuid = "11111111-1111-1111-1111-111111111111";

describe("dashboard-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("returns zero stats when user has no approved causes", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([]);

      const result = await getDashboardStats("user-1");

      expect(result).toEqual({
        totalRaised: expect.stringContaining("0"),
        totalDonors: 0,
        activeCauses: 0,
      });
    });

    it("aggregates donations across approved causes", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([{ id: "cause-1" }]);
      mockPrisma.donation.aggregate.mockResolvedValue({
        _sum: { amount: 1500 },
      });
      mockPrisma.donation.findMany.mockResolvedValue([
        { userId: "donor-1" },
        { userId: "donor-2" },
        { userId: "donor-1" },
      ]);

      const result = await getDashboardStats("user-1");

      expect(result.totalDonors).toBe(2);
      expect(result.activeCauses).toBe(1);
      expect(result.totalRaised).toContain("1,500");
    });

    it("returns zero stats when prisma throws", async () => {
      mockPrisma.cause.findMany.mockRejectedValue(new Error("db error"));

      const result = await getDashboardStats("user-1");

      expect(result).toEqual({
        totalRaised: expect.stringContaining("0"),
        totalDonors: 0,
        activeCauses: 0,
      });
    });
  });

  describe("getDonationTrends", () => {
    it("returns monthly donation totals", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([{ id: "cause-1" }]);
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          amount: 100,
          createdAt: new Date("2024-06-15T00:00:00.000Z"),
        },
        {
          amount: 50,
          createdAt: new Date("2024-06-20T00:00:00.000Z"),
        },
      ]);

      const result = await getDonationTrends("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(150);
      expect(result[0].month).toBeTruthy();
    });

    it("returns an empty array when user has no causes", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([]);

      expect(await getDonationTrends("user-1")).toEqual([]);
    });
  });

  describe("getUserCauses", () => {
    it("filters causes by status when provided", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([{ id: "cause-1" }]);

      const result = await getUserCauses("user-1", "approved");

      expect(result).toHaveLength(1);
      expect(mockPrisma.cause.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", status: "approved" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("getUserCausesWithStats", () => {
    it("returns causes with raised totals", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([
        { id: "cause-1", title: "Cause 1" },
      ]);
      mockPrisma.donation.groupBy.mockResolvedValue([
        { causeId: "cause-1", _sum: { amount: 300 } },
      ]);

      const result = await getUserCausesWithStats("user-1");

      expect(result).toEqual([
        expect.objectContaining({ id: "cause-1", raised: 300 }),
      ]);
    });
  });

  describe("getUserPetitionsWithStats", () => {
    it("returns petitions with signature counts", async () => {
      mockPrisma.petitions.findMany.mockResolvedValue([
        { id: "petition-1", title: "Petition 1" },
      ]);
      mockPrisma.signatures.groupBy.mockResolvedValue([
        { petition_id: "petition-1", _count: { petition_id: 4 } },
      ]);

      const result = await getUserPetitionsWithStats("user-1");

      expect(result).toEqual([
        expect.objectContaining({ id: "petition-1", signatures: 4 }),
      ]);
    });
  });

  describe("getCauseAnalytics", () => {
    it("returns null for invalid cause ids", async () => {
      expect(await getCauseAnalytics("not-a-uuid")).toBeNull();
      expect(mockPrisma.donation.findMany).not.toHaveBeenCalled();
    });

    it("returns analytics for a valid cause", async () => {
      mockPrisma.donation.findMany.mockResolvedValue([
        {
          amount: 100,
          createdAt: new Date(),
          message: "Great cause",
          userId: "donor-1",
        },
      ]);
      mockPrisma.cause.findUnique.mockResolvedValue({
        goal: 1000,
        shared: 10,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      });

      const result = await getCauseAnalytics(validUuid);

      expect(result).toEqual(
        expect.objectContaining({
          overview: expect.objectContaining({
            totalDonations: 100,
            totalDonors: 1,
          }),
          engagement: expect.objectContaining({ shares: 10 }),
        }),
      );
    });

    it("returns null when cause is not found", async () => {
      mockPrisma.donation.findMany.mockResolvedValue([]);
      mockPrisma.cause.findUnique.mockResolvedValue(null);

      expect(await getCauseAnalytics(validUuid)).toBeNull();
    });
  });

  describe("getPetitionDashboardStats", () => {
    it("returns zero stats when user has no approved petitions", async () => {
      mockPrisma.petitions.findMany.mockResolvedValue([]);

      const result = await getPetitionDashboardStats("user-1");

      expect(result).toEqual({
        totalRaised: expect.stringContaining("0"),
        totalDonors: 0,
        activePetitions: 0,
      });
    });

    it("aggregates signature totals for approved petitions", async () => {
      mockPrisma.petitions.findMany.mockResolvedValue([{ id: "petition-1" }]);
      mockPrisma.signatures.aggregate.mockResolvedValue({
        _sum: { amount: 2000 },
      });
      mockPrisma.signatures.findMany.mockResolvedValue([
        { user_id: "signer-1" },
        { user_id: "signer-2" },
      ]);

      const result = await getPetitionDashboardStats("user-1");

      expect(result.totalDonors).toBe(2);
      expect(result.activePetitions).toBe(1);
    });
  });

  describe("getPetitionSignatureTrends", () => {
    it("returns monthly signature totals", async () => {
      mockPrisma.signatures.findMany.mockResolvedValue([
        {
          amount: 25,
          created_at: new Date("2024-05-10T00:00:00.000Z"),
        },
      ]);

      const result = await getPetitionSignatureTrends("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(25);
    });
  });

  describe("getUserPetitions", () => {
    it("filters petitions by status when provided", async () => {
      mockPrisma.petitions.findMany.mockResolvedValue([{ id: "petition-1" }]);

      const result = await getUserPetitions("user-1", "approved");

      expect(result).toHaveLength(1);
      expect(mockPrisma.petitions.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-1", status: "approved" },
        orderBy: { created_at: "desc" },
      });
    });
  });

  describe("getPetitionAnalytics", () => {
    it("returns null for invalid petition ids", async () => {
      expect(await getPetitionAnalytics("bad-id")).toBeNull();
    });

    it("returns analytics for a valid petition", async () => {
      mockPrisma.signatures.findMany.mockResolvedValue([
        {
          amount: 50,
          created_at: new Date(),
          message: "I support this",
          user_id: "signer-1",
        },
      ]);
      mockPrisma.petitions.findUnique.mockResolvedValue({
        goal: 500,
        shared: 3,
        created_at: new Date("2024-01-01T00:00:00.000Z"),
      });

      const result = await getPetitionAnalytics(validUuid);

      expect(result).toEqual(
        expect.objectContaining({
          overview: expect.objectContaining({
            totalSignatures: 50,
            totalSigners: 1,
          }),
        }),
      );
    });
  });
});
