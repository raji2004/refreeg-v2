/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    cause_edits: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cause_sections: { createMany: jest.fn(), deleteMany: jest.fn() },
    cause_edit_sections: { createMany: jest.fn(), findMany: jest.fn() },
    campaign_follows: { findFirst: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/actions/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendCauseSubmissionAdminNotification: jest.fn().mockResolvedValue(undefined),
  sendCauseRejectedEmailForUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  uploadToS3: jest.fn().mockResolvedValue(undefined),
  generateS3Key: jest.fn(() => "causes/user/cause/image.jpg"),
}));

jest.mock("@/lib/locations/campaign-location", () => ({
  resolveCampaignLocation: jest.fn(async (location?: string) =>
    location?.trim() ? location.trim() : "Lagos, Lagos, Nigeria",
  ),
  resolveDeviceCampaignLocation: jest.fn(
    async () => "Lagos, Lagos, Nigeria",
  ),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth-actions";
import { isAdminOrManager } from "@/actions/role-actions";
import {
  sendCauseRejectedEmailForUser,
} from "@/services/mail";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getCause,
  createCause,
  updateCause,
  listCauses,
  countCauses,
  updateCauseStatus,
  getCauseEdits,
  getUserCauses,
  deleteCause,
  updateCauseTrustMetrics,
} from "@/actions/cause-actions";
import { resolveDeviceCampaignLocation } from "@/lib/locations/campaign-location";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const mockGetCurrentUser = getCurrentUser as jest.Mock;
const mockIsAdminOrManager = isAdminOrManager as jest.Mock;
const mockPrisma = prisma as unknown as {
  cause: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  cause_edits: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  cause_sections: { createMany: jest.Mock; deleteMany: jest.Mock };
  cause_edit_sections: { createMany: jest.Mock; findMany: jest.Mock };
  campaign_follows: { findFirst: jest.Mock; upsert: jest.Mock };
  user: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const basePrismaCause = {
  id: VALID_UUID,
  userId: "owner-1",
  title: "Test Cause",
  category: "education",
  goal: 10000,
  raised: 500,
  shared: 0,
  status: "approved",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
  start_date: null,
  end_date: null,
  multimedia: [],
  videoLinks: [],
  user: {
    fullName: "Owner",
    email: "owner@example.com",
    username: "owner",
    subAccountCode: "SUB123",
    profilePhoto: null,
  },
  sections: [],
};

describe("cause-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
    mockIsAdminOrManager.mockResolvedValue(false);
  });

  describe("getCause", () => {
    it("returns null for invalid UUID", async () => {
      const result = await getCause("not-a-uuid");

      expect(result).toBeNull();
      expect(mockPrisma.cause.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when cause does not exist", async () => {
      mockPrisma.cause.findUnique.mockResolvedValue(null);

      const result = await getCause(VALID_UUID);

      expect(result).toBeNull();
    });

    it("redirects when pending cause is viewed by non-owner non-admin", async () => {
      mockPrisma.cause.findUnique.mockResolvedValue({
        ...basePrismaCause,
        status: "pending",
      });
      mockGetCurrentUser.mockResolvedValue({ id: "other-user" });

      await getCause(VALID_UUID);

      expect(redirect).toHaveBeenCalledWith("/");
    });

    it("returns cause with user details for approved cause", async () => {
      mockPrisma.cause.findUnique.mockResolvedValue(basePrismaCause);
      mockGetCurrentUser.mockResolvedValue({ id: "viewer-1" });
      mockPrisma.campaign_follows.findFirst.mockResolvedValue(null);

      const result = await getCause(VALID_UUID);

      expect(result).toEqual(
        expect.objectContaining({
          id: VALID_UUID,
          title: "Test Cause",
          user: expect.objectContaining({
            name: "Owner",
            email: "owner@example.com",
          }),
          isFollowing: false,
        }),
      );
    });
  });

  describe("createCause", () => {
    it("creates a cause without media uploads", async () => {
      const createdCause = {
        ...basePrismaCause,
        status: "pending",
        goal: 5000,
      };
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          cause: {
            create: jest.fn().mockResolvedValue(createdCause),
          },
          cause_sections: { createMany: jest.fn() },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Creator",
        email: "creator@example.com",
      });

      const result = await createCause("owner-1", {
        title: "New Cause",
        category: "health",
        goal: 5000,
        sections: [],
        deviceLocation: {
          latitude: 6.5244,
          longitude: 3.3792,
          accuracy: 50,
          capturedAt: Date.now(),
        },
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          title: "Test Cause",
          status: "pending",
          goal: 5000,
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/causes");
      expect(resolveDeviceCampaignLocation).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 6.5244, longitude: 3.3792 }),
      );
    });
  });

  describe("updateCause", () => {
    it("throws when a pending edit already exists", async () => {
      mockPrisma.cause_edits.findFirst.mockResolvedValue({ id: "edit-1" });

      await expect(
        updateCause(VALID_UUID, "owner-1", { title: "Updated" } as any),
      ).rejects.toThrow("You already have a pending edit");
    });

    it("creates a pending cause edit", async () => {
      mockPrisma.cause_edits.findFirst.mockResolvedValue(null);
      const edit = { id: "edit-1", status: "pending" };
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          cause_edits: {
            create: jest.fn().mockResolvedValue(edit),
          },
          cause_edit_sections: { createMany: jest.fn() },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Owner",
        email: "owner@example.com",
      });

      const result = await updateCause(VALID_UUID, "owner-1", {
        title: "Updated Title",
        category: "health",
        goal: 8000,
      } as any);

      expect(result).toEqual(edit);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/causes");
    });
  });

  describe("listCauses", () => {
    it("defaults to approved status for public listing", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([
        {
          ...basePrismaCause,
          user: {
            fullName: "Owner",
            email: "owner@example.com",
            profilePhoto: null,
          },
        },
      ]);

      const result = await listCauses();

      expect(mockPrisma.cause.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "approved" }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("filters expired causes from public results", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([
        {
          ...basePrismaCause,
          end_date: new Date("2020-01-01"),
          user: { fullName: "A", email: "a@test.com", profilePhoto: null },
        },
        {
          ...basePrismaCause,
          id: "550e8400-e29b-41d4-a716-446655440001",
          end_date: null,
          user: { fullName: "B", email: "b@test.com", profilePhoto: null },
        },
      ]);

      const result = await listCauses();

      expect(result).toHaveLength(1);
    });
  });

  describe("countCauses", () => {
    it("counts approved non-expired causes by default", async () => {
      mockPrisma.cause.count.mockResolvedValue(12);

      const result = await countCauses();

      expect(result).toBe(12);
      expect(mockPrisma.cause.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: "approved" }),
      });
    });
  });

  describe("updateCauseStatus", () => {
    it("throws when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(
        updateCauseStatus(VALID_UUID, "approved"),
      ).rejects.toThrow("Not authenticated");
    });

    it("throws when user is not admin or manager", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(
        updateCauseStatus(VALID_UUID, "approved"),
      ).rejects.toThrow("Unauthorized");
    });

    it("approves cause without pending edit", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "admin-1" });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.cause_edits.findFirst.mockResolvedValue(null);
      mockPrisma.cause.update.mockResolvedValue({
        ...basePrismaCause,
        status: "approved",
      });

      const result = await updateCauseStatus(VALID_UUID, "approved");

      expect(result.status).toBe("approved");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/causes");
    });

    it("rejects cause and sends rejection email", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "admin-1" });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.cause_edits.findFirst.mockResolvedValue(null);
      mockPrisma.cause.update.mockResolvedValue({
        ...basePrismaCause,
        status: "rejected",
        userId: "owner-1",
        title: "Rejected Cause",
      });

      const result = await updateCauseStatus(
        VALID_UUID,
        "rejected",
        "Incomplete info",
      );

      expect(result.status).toBe("rejected");
      expect(sendCauseRejectedEmailForUser).toHaveBeenCalledWith(
        "owner-1",
        expect.objectContaining({
          causeName: "Rejected Cause",
          rejectionReason: "Incomplete info",
        }),
      );
    });
  });

  describe("getCauseEdits", () => {
    it("returns pending edits with profile mapping", async () => {
      mockPrisma.cause_edits.findMany.mockResolvedValue([
        {
          id: "edit-1",
          status: "pending",
          user: {
            fullName: "Editor",
            email: "editor@example.com",
            profilePhoto: null,
          },
          sections: [{ id: "s1", heading: "About", description: "Details" }],
        },
      ]);

      const result = await getCauseEdits();

      expect(result[0]).toEqual(
        expect.objectContaining({
          profiles: {
            full_name: "Editor",
            email: "editor@example.com",
            profile_photo: null,
          },
          cause_edit_sections: [
            expect.objectContaining({ heading: "About" }),
          ],
        }),
      );
    });
  });

  describe("getUserCauses", () => {
    it("returns mapped causes for a user", async () => {
      mockPrisma.cause.findMany.mockResolvedValue([basePrismaCause]);

      const result = await getUserCauses("owner-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: VALID_UUID, title: "Test Cause" }),
      );
    });
  });

  describe("deleteCause", () => {
    it("deletes the cause by id", async () => {
      mockPrisma.cause.delete.mockResolvedValue({ id: VALID_UUID });

      await deleteCause(VALID_UUID);

      expect(mockPrisma.cause.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      });
    });
  });

  describe("updateCauseTrustMetrics", () => {
    it("throws when caller is not admin", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(
        updateCauseTrustMetrics(VALID_UUID, {
          verified_status: "verified",
        }),
      ).rejects.toThrow("Unauthorized: Only admins can update trust metrics");
    });

    it("updates trust metrics when admin", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "admin-1" });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.cause.update.mockResolvedValue({ id: VALID_UUID });

      await updateCauseTrustMetrics(VALID_UUID, {
        trust_score: {
          impact: "A",
          readability: "A",
          transparency: "High",
        },
        verified_status: "verified",
      });

      expect(mockPrisma.cause.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: expect.objectContaining({
          verified_status: "verified",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/causes");
    });
  });
});
