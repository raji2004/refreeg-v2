/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    signatures: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    petitions: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/mail", () => ({
  sendPetitionGoalReachedEmail: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  checkUserSignature,
  createSignature,
  listSignaturesForPetition,
  listUserSignatures,
} from "@/actions/signature-actions";

const mockPrisma = prisma as unknown as {
  signatures: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    aggregate: jest.Mock;
  };
  petitions: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const signatureRecord = {
  id: "sig-1",
  petition_id: "petition-1",
  user_id: "user-1",
  amount: 1,
  name: "Jane Doe",
  email: "jane@test.com",
  message: "Support!",
  is_anonymous: false,
  status: "completed",
  created_at: new Date("2026-01-15T10:00:00.000Z"),
};

describe("signature-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkUserSignature", () => {
    it("returns true when user has already signed", async () => {
      mockPrisma.signatures.findFirst.mockResolvedValue({ id: "sig-1" });

      const result = await checkUserSignature("petition-1", "user-1");

      expect(result).toBe(true);
    });

    it("returns false when user has not signed", async () => {
      mockPrisma.signatures.findFirst.mockResolvedValue(null);

      const result = await checkUserSignature("petition-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("createSignature", () => {
    it("throws when logged-in user has already signed", async () => {
      mockPrisma.signatures.findFirst.mockResolvedValue({ id: "sig-1" });

      await expect(
        createSignature("petition-1", "user-1", {
          name: "Jane Doe",
          email: "jane@test.com",
          isAnonymous: false,
        }),
      ).rejects.toThrow("You have already signed this petition");
    });

    it("creates signature and revalidates paths", async () => {
      mockPrisma.signatures.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          signatures: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(signatureRecord),
          },
        }),
      );
      mockPrisma.petitions.findUnique.mockResolvedValue({
        id: "petition-1",
        goal: 100,
        user_id: "owner-1",
        title: "Save Park",
      });
      mockPrisma.signatures.aggregate.mockResolvedValue({
        _sum: { amount: 10 },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "owner@test.com",
        fullName: "Owner",
      });

      const result = await createSignature("petition-1", "user-1", {
        name: "Jane Doe",
        email: "jane@test.com",
        isAnonymous: false,
        message: "Support!",
      });

      expect(result.id).toBe("sig-1");
      expect(result.created_at).toBe("2026-01-15T10:00:00.000Z");
      expect(revalidatePath).toHaveBeenCalledWith("/petitions/petition-1");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/signatures");
    });

    it("throws when duplicate name and email exists in transaction", async () => {
      mockPrisma.signatures.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          signatures: {
            findFirst: jest.fn().mockResolvedValue({ id: "existing" }),
            create: jest.fn(),
          },
        }),
      );

      await expect(
        createSignature("petition-1", null, {
          name: "Jane Doe",
          email: "jane@test.com",
          isAnonymous: false,
        }),
      ).rejects.toThrow("already been recorded");
    });
  });

  describe("listSignaturesForPetition", () => {
    it("returns signatures with ISO date strings", async () => {
      mockPrisma.signatures.findMany.mockResolvedValue([signatureRecord]);

      const result = await listSignaturesForPetition("petition-1");

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1);
      expect(result[0].created_at).toBe("2026-01-15T10:00:00.000Z");
    });
  });

  describe("listUserSignatures", () => {
    it("returns user signatures with petition info", async () => {
      mockPrisma.signatures.findMany.mockResolvedValue([
        {
          ...signatureRecord,
          petition: { title: "Save Park", category: "environment" },
        },
      ]);

      const result = await listUserSignatures("user-1");

      expect(result[0].petition).toEqual({
        title: "Save Park",
        category: "environment",
      });
    });
  });
});
