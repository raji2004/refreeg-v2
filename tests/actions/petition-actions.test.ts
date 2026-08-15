jest.mock("@/lib/prisma", () => ({
  prisma: {
    petitions: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    petition_sections: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    petition_edits: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    petition_edit_sections: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    signatures: {
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/actions/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendPetitionApprovedEmailForUser: jest.fn(),
  sendPetitionRejectedEmailForUser: jest.fn(),
  sendPetitionSubmissionAdminNotification: jest.fn(),
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  uploadToS3: jest.fn(),
  generateS3Key: jest.fn(() => "petitions/user/key.jpg"),
}));

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth-actions";
import { isAdminOrManager } from "@/actions/role-actions";
import {
  sendPetitionApprovedEmailForUser,
  sendPetitionRejectedEmailForUser,
} from "@/services/mail";
import {
  getPetition,
  listPetitions,
  countPetitions,
  updatePetitionStatus,
  getPetitionEdits,
  getUserPetitions,
  deletePetition,
  savePetitionShare,
  createPetition,
} from "@/actions/petition-actions";

const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockIsAdminOrManager = isAdminOrManager as jest.Mock;
const mockSendApproved = sendPetitionApprovedEmailForUser as jest.Mock;
const mockSendRejected = sendPetitionRejectedEmailForUser as jest.Mock;
const mockPrisma = prisma as unknown as {
  petitions: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  petition_sections: { createMany: jest.Mock; deleteMany: jest.Mock };
  petition_edits: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  petition_edit_sections: { createMany: jest.Mock; deleteMany: jest.Mock };
  signatures: { groupBy: jest.Mock };
  user: { findUnique: jest.Mock };
};

function buildPetition(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date("2024-01-01T00:00:00.000Z");
  const updatedAt = new Date("2024-01-02T00:00:00.000Z");
  return {
    id: "petition-1",
    user_id: "owner-1",
    title: "Save the park",
    status: "approved",
    goal: 1000,
    raised: 250,
    multimedia: [],
    video_links: [],
    created_at: createdAt,
    updated_at: updatedAt,
    user: {
      fullName: "Owner",
      email: "owner@example.com",
      subAccountCode: "SUB_1",
      profilePhoto: null,
    },
    petition_sections: [{ id: "sec-1", heading: "Why", description: "Because" }],
    ...overrides,
  };
}

describe("petition-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "owner-1" });
    mockIsAdminOrManager.mockResolvedValue(false);
    mockSendApproved.mockResolvedValue(undefined);
    mockSendRejected.mockResolvedValue(undefined);
  });

  describe("getPetition", () => {
    it("returns a mapped approved petition for the owner", async () => {
      mockPrisma.petitions.findUnique.mockResolvedValue(buildPetition());

      const result = await getPetition("petition-1");

      expect(result).toEqual(
        expect.objectContaining({
          id: "petition-1",
          goal: 1000,
          raised: 250,
          user: {
            name: "Owner",
            email: "owner@example.com",
            sub_account_code: "SUB_1",
          },
        }),
      );
    });

    it("returns null when petition does not exist", async () => {
      mockPrisma.petitions.findUnique.mockResolvedValue(null);

      expect(await getPetition("missing")).toBeNull();
    });

    it("redirects unauthorized viewers away from pending petitions", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "other-user" });
      mockPrisma.petitions.findUnique.mockResolvedValue(
        buildPetition({ status: "pending" }),
      );

      const result = await getPetition("petition-1");

      expect(redirect).toHaveBeenCalledWith("/");
      expect(result).toBeNull();
    });
  });

  describe("listPetitions", () => {
    it("defaults to approved petitions for public listings", async () => {
      const createdAt = new Date("2024-01-01T00:00:00.000Z");
      const updatedAt = new Date("2024-01-02T00:00:00.000Z");
      mockPrisma.petitions.findMany.mockResolvedValue([
        {
          id: "petition-1",
          status: "approved",
          goal: 100,
          raised: 10,
          created_at: createdAt,
          updated_at: updatedAt,
          user: {
            fullName: "Owner",
            email: "owner@example.com",
            profilePhoto: null,
          },
        },
      ]);

      const result = await listPetitions();

      expect(mockPrisma.petitions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "approved" },
        }),
      );
      expect(result[0].goal).toBe(100);
    });
  });

  describe("countPetitions", () => {
    it("counts petitions with default approved filter", async () => {
      mockPrisma.petitions.count.mockResolvedValue(3);

      expect(await countPetitions()).toBe(3);
      expect(mockPrisma.petitions.count).toHaveBeenCalledWith({
        where: { status: "approved" },
      });
    });
  });

  describe("updatePetitionStatus", () => {
    it("throws when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(
        updatePetitionStatus("petition-1", "approved"),
      ).rejects.toThrow("Not authenticated");
    });

    it("approves a petition without pending edits", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "admin-1" });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.petition_edits.findFirst.mockResolvedValue(null);
      const updated = buildPetition({ status: "approved" });
      mockPrisma.petitions.update.mockResolvedValue(updated);

      const result = await updatePetitionStatus("petition-1", "approved");

      expect(result.status).toBe("approved");
      expect(mockSendApproved).toHaveBeenCalledWith("owner-1", {
        petitionName: "Save the park",
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/admin/petitions",
      );
    });

    it("rejects a petition and sends rejection email", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "admin-1" });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.petition_edits.findFirst.mockResolvedValue(null);
      const updated = buildPetition({ status: "rejected" });
      mockPrisma.petitions.update.mockResolvedValue(updated);

      const result = await updatePetitionStatus(
        "petition-1",
        "rejected",
        "Incomplete details",
      );

      expect(result.status).toBe("rejected");
      expect(mockSendRejected).toHaveBeenCalledWith("owner-1", {
        petitionName: "Save the park",
        rejectionReason: "Incomplete details",
      });
    });
  });

  describe("getPetitionEdits", () => {
    it("returns pending edits with mapped fields", async () => {
      const createdAt = new Date("2024-01-01T00:00:00.000Z");
      const updatedAt = new Date("2024-01-02T00:00:00.000Z");
      mockPrisma.petition_edits.findMany.mockResolvedValue([
        {
          id: "edit-1",
          goal: 500,
          created_at: createdAt,
          updated_at: updatedAt,
          user: {
            fullName: "Owner",
            email: "owner@example.com",
            profilePhoto: null,
          },
          petition_edit_sections: [],
        },
      ]);

      const result = await getPetitionEdits();

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "edit-1",
          goal: 500,
          profiles: {
            full_name: "Owner",
            email: "owner@example.com",
            profile_photo: null,
          },
        }),
      );
    });
  });

  describe("getUserPetitions", () => {
    it("returns petitions for a user", async () => {
      const createdAt = new Date("2024-01-01T00:00:00.000Z");
      const updatedAt = new Date("2024-01-02T00:00:00.000Z");
      mockPrisma.petitions.findMany.mockResolvedValue([
        {
          id: "petition-1",
          goal: 100,
          raised: 0,
          created_at: createdAt,
          updated_at: updatedAt,
        },
      ]);
      mockPrisma.signatures.groupBy.mockResolvedValue([
        { petition_id: "petition-1", _count: { petition_id: 3 } },
      ]);

      const result = await getUserPetitions("owner-1");

      expect(result[0].goal).toBe(100);
      expect(result[0].signatures).toBe(3);
      expect(mockPrisma.petitions.findMany).toHaveBeenCalledWith({
        where: { user_id: "owner-1" },
        orderBy: { created_at: "desc" },
      });
    });
  });

  describe("deletePetition", () => {
    it("deletes a petition by id", async () => {
      mockPrisma.petitions.delete.mockResolvedValue({});

      await deletePetition("petition-1");

      expect(mockPrisma.petitions.delete).toHaveBeenCalledWith({
        where: { id: "petition-1" },
      });
    });
  });

  describe("savePetitionShare", () => {
    it("increments the shared counter", async () => {
      mockPrisma.petitions.update.mockResolvedValue({});

      await savePetitionShare("petition-1");

      expect(mockPrisma.petitions.update).toHaveBeenCalledWith({
        where: { id: "petition-1" },
        data: { shared: { increment: 1 } },
      });
    });
  });

  describe("createPetition", () => {
    it("creates a petition without media uploads", async () => {
      const createdAt = new Date("2024-01-01T00:00:00.000Z");
      const updatedAt = new Date("2024-01-02T00:00:00.000Z");
      mockPrisma.petitions.create.mockResolvedValue({
        id: "petition-new",
        title: "New Petition",
        goal: 500,
        raised: 0,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Owner",
        email: "owner@example.com",
      });

      const result = await createPetition("owner-1", {
        title: "New Petition",
        category: "environment",
        goal: 500,
        sections: [{ heading: "Why", description: "Because" }],
      });

      expect(result.title).toBe("New Petition");
      expect(mockPrisma.petition_sections.createMany).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/petitions");
    });
  });
});
