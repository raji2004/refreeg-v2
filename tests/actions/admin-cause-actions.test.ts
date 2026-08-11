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
    cause_edits: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cause: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/mail", () => ({
  sendCauseRejectedEmailForUser: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/role-actions";
import { prisma } from "@/lib/prisma";
import { sendCauseRejectedEmailForUser } from "@/services/mail";
import {
  listAdminCauses,
  getCauseEdits,
  updateCauseStatus,
} from "@/actions/admin-cause-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  cause_edits: { findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
  cause: { update: jest.Mock; findUnique: jest.Mock };
  $transaction: jest.Mock;
};

describe("admin-cause-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    (isAdminOrManager as jest.Mock).mockResolvedValue(true);
    mockPrisma.cause.findUnique.mockResolvedValue({ location: "Lagos" });
  });

  describe("listAdminCauses", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(listAdminCauses()).rejects.toThrow("Unauthorized");
    });

    it("throws when user lacks admin or manager role", async () => {
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      await expect(listAdminCauses()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });

    it("returns mapped causes for admin", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "cause-1",
          title: "Help School",
          category: "education",
          goal: "100000",
          raised: "25000",
          status: "pending",
          rejectionReason: null,
          image: "img.jpg",
          created_at: new Date("2026-01-01"),
          updated_at: new Date("2026-01-02"),
          user_id: "user-1",
          full_name: "Creator",
          email: "creator@test.com",
          profile_photo: "photo.jpg",
        },
      ]);

      const result = await listAdminCauses("pending");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "cause-1",
        goal: 100000,
        raised: 25000,
        profiles: {
          full_name: "Creator",
          email: "creator@test.com",
        },
      });
    });
  });

  describe("getCauseEdits", () => {
    it("returns pending edits with sections", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: "edit-1",
            original_cause_id: "cause-1",
            title: "Updated Title",
            category: "health",
            goal: "50000",
            image: "img.jpg",
            multimedia: [],
            video_links: [],
            days_active: 30,
            status: "pending",
            rejection_reason: null,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-02"),
            summary: "Summary",
            location: "Lagos",
            user_id: "user-1",
            user_fullName: "Creator",
            user_email: "creator@test.com",
            user_profilePhoto: null,
          },
        ])
        .mockResolvedValueOnce([
          { id: "sec-1", heading: "Why", description: "Because" },
        ]);

      const result = await getCauseEdits();

      expect(result).toHaveLength(1);
      expect(result[0].cause_edit_sections).toHaveLength(1);
      expect(result[0].goal).toBe(50000);
    });
  });

  describe("updateCauseStatus", () => {
    it("approves cause without pending edit", async () => {
      mockPrisma.cause_edits.findFirst.mockResolvedValue(null);
      mockPrisma.cause.findUnique.mockResolvedValue({ location: "Abuja" });
      mockPrisma.cause.update.mockResolvedValue({});

      const result = await updateCauseStatus("cause-1", "approved");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.cause.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cause-1" },
          data: expect.objectContaining({ status: "approved" }),
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/causes");
    });

    it("rejects cause and sends rejection email", async () => {
      mockPrisma.cause_edits.findFirst.mockResolvedValue(null);
      mockPrisma.cause.update.mockResolvedValue({
        userId: "user-1",
        title: "Help School",
      });

      const result = await updateCauseStatus(
        "cause-1",
        "rejected",
        "Incomplete docs",
      );

      expect(result).toEqual({ success: true });
      expect(sendCauseRejectedEmailForUser).toHaveBeenCalledWith("user-1", {
        causeName: "Help School",
        rejectionReason: "Incomplete docs",
        dashboardUrl: "https://www.refreeg.com/dashboard/causes?status=rejected",
      });
    });
  });
});
