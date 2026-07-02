/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auth/admin-auth", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    logs: { create: jest.fn() },
    kyc_verifications: {
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    role: { deleteMany: jest.fn() },
    userWallet: { deleteMany: jest.fn() },
    userStreak: { deleteMany: jest.fn() },
    rewardTransaction: { deleteMany: jest.fn() },
    session: { deleteMany: jest.fn() },
    account: { deleteMany: jest.fn() },
  },
}));

import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { isAdminOrManager } from "@/actions/role-actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  deleteUserAsAdmin,
  getUserDetailsForAdmin,
} from "@/actions/admin-user-actions";

const mockAuth = auth as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockIsAdminOrManager = isAdminOrManager as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: {
    update: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  logs: { create: jest.Mock };
  kyc_verifications: {
    deleteMany: jest.Mock;
    findFirst: jest.Mock;
  };
  role: { deleteMany: jest.Mock };
  userWallet: { deleteMany: jest.Mock };
  userStreak: { deleteMany: jest.Mock };
  rewardTransaction: { deleteMany: jest.Mock };
  session: { deleteMany: jest.Mock };
  account: { deleteMany: jest.Mock };
};

describe("admin-user-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("blockUser", () => {
    it("returns false when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await blockUser("target-user");

      expect(result).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns false when caller is not admin or manager", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(false);

      const result = await blockUser("target-user");

      expect(result).toBe(false);
    });

    it("blocks user and logs the action", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: "target-user" });
      mockPrisma.logs.create.mockResolvedValue({ id: "log-1" });

      const result = await blockUser("target-user");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { isBlocked: true, updatedAt: expect.any(Date) },
      });
      expect(mockPrisma.logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "block-user" }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });
  });

  describe("unblockUser", () => {
    it("unblocks user when authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: "target-user" });
      mockPrisma.logs.create.mockResolvedValue({ id: "log-1" });

      const result = await unblockUser("target-user");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { isBlocked: false, updatedAt: expect.any(Date) },
      });
    });
  });

  describe("isUserBlocked", () => {
    it("returns true when user is blocked", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isBlocked: true });

      const result = await isUserBlocked("user-1");

      expect(result).toBe(true);
    });

    it("returns false when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await isUserBlocked("missing");

      expect(result).toBe(false);
    });
  });

  describe("deleteUserAsAdmin", () => {
    it("returns error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await deleteUserAsAdmin("target-user");

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("returns error when caller lacks admin role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockGetUserRole.mockResolvedValue("user");

      const result = await deleteUserAsAdmin("target-user");

      expect(result.error).toContain("Unauthorized");
    });

    it("deletes user and related records when authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockGetUserRole.mockResolvedValue("admin");
      mockPrisma.kyc_verifications.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.role.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userWallet.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userStreak.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.rewardTransaction.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.account.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue({ id: "target-user" });
      mockPrisma.logs.create.mockResolvedValue({ id: "log-1" });

      const result = await deleteUserAsAdmin("target-user");

      expect(result).toEqual({ error: null });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "target-user" },
      });
    });
  });

  describe("getUserDetailsForAdmin", () => {
    it("throws when caller is not admin or manager", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(getUserDetailsForAdmin("target-user")).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });

    it("returns user details with KYC when authorized", async () => {
      mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
      mockIsAdminOrManager.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "target-user",
        email: "user@example.com",
        fullName: "Test User",
        causes: [],
        donations: [],
        roles: [{ role: "user" }],
      });
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        status: "approved",
      });

      const result = await getUserDetailsForAdmin("target-user");

      expect(result).toEqual(
        expect.objectContaining({
          id: "target-user",
          kyc_verifications: [
            expect.objectContaining({ id: "kyc-1", status: "approved" }),
          ],
        }),
      );
    });
  });
});
