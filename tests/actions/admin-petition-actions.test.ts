/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock("@/services/mail", () => ({
  sendPetitionApprovedEmailForUser: jest.fn(),
  sendPetitionRejectedEmailForUser: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/role-actions";
import { prisma } from "@/lib/prisma";
import {
  sendPetitionApprovedEmailForUser,
  sendPetitionRejectedEmailForUser,
} from "@/services/mail";
import {
  listAdminPetitions,
  getPetitionEdits,
  updatePetitionStatus,
} from "@/actions/admin-petition-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

describe("admin-petition-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    (isAdminOrManager as jest.Mock).mockResolvedValue(true);
    (sendPetitionApprovedEmailForUser as jest.Mock).mockResolvedValue({});
    (sendPetitionRejectedEmailForUser as jest.Mock).mockResolvedValue({});
  });

  describe("listAdminPetitions", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(listAdminPetitions()).rejects.toThrow("Unauthorized");
    });

    it("throws when user lacks admin or manager role", async () => {
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      await expect(listAdminPetitions()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });

    it("returns mapped petitions for admin", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "petition-1",
          title: "Save Park",
          category: "environment",
          goal: "1000",
          raised: "250",
          status: "pending",
          rejection_reason: null,
          image: "img.jpg",
          created_at: new Date("2026-01-01"),
          updated_at: new Date("2026-01-02"),
          user_id: "user-1",
          full_name: "Creator",
          email: "creator@test.com",
          profile_photo: null,
        },
      ]);

      const result = await listAdminPetitions("pending");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "petition-1",
        goal: 1000,
        raised: 250,
        profiles: {
          full_name: "Creator",
          email: "creator@test.com",
        },
      });
    });
  });

  describe("getPetitionEdits", () => {
    it("returns pending petition edits with sections", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "edit-1",
            original_petition_id: "petition-1",
            title: "Updated Petition",
            description: "Updated desc",
            category: "health",
            goal: "500",
            image: "img.jpg",
            multimedia: [],
            video_links: [],
            days_active: 30,
            status: "pending",
            rejection_reason: null,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-02"),
            user_id: "user-1",
            user_fullName: "Creator",
            user_email: "creator@test.com",
            user_profilePhoto: null,
          },
        ])
        .mockResolvedValueOnce([
          { id: "sec-1", heading: "Why", description: "Because" },
        ]);

      const result = await getPetitionEdits();

      expect(result).toHaveLength(1);
      expect(result[0].petition_edit_sections).toHaveLength(1);
      expect(result[0].goal).toBe(500);
    });
  });

  describe("updatePetitionStatus", () => {
    it("approves petition without pending edit and sends email", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { user_id: "user-1", title: "Save Park" },
        ]);

      const result = await updatePetitionStatus("petition-1", "approved");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(sendPetitionApprovedEmailForUser).toHaveBeenCalledWith("user-1", {
        petitionName: "Save Park",
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/admin/petitions",
      );
    });

    it("rejects petition and sends rejection email", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { user_id: "user-1", title: "Save Park" },
        ]);

      const result = await updatePetitionStatus(
        "petition-1",
        "rejected",
        "Incomplete",
      );

      expect(result).toEqual({ success: true });
      expect(sendPetitionRejectedEmailForUser).toHaveBeenCalledWith("user-1", {
        petitionName: "Save Park",
        rejectionReason: "Incomplete",
      });
    });
  });
});
