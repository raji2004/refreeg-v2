jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    kyc_verifications: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/actions/role-actions", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/actions/role-actions";
import { logAdminActivity } from "@/actions/database-actions";
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  deleteUserAccount,
  deleteUserAsAdmin,
} from "@/actions/user-actions";

const mockAuth = auth as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockLogAdminActivity = logAdminActivity as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: {
    update: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  kyc_verifications: { deleteMany: jest.Mock };
};

describe("user-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockGetUserRole.mockResolvedValue("admin");
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.kyc_verifications.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.user.delete.mockResolvedValue({});
    mockLogAdminActivity.mockResolvedValue(undefined);
  });

  describe("blockUser", () => {
    it("blocks a user when caller is admin", async () => {
      const result = await blockUser("user-2");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { isBlocked: true, updatedAt: expect.any(Date) },
      });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "block-user",
        "admin-1",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });

    it("returns false when session is missing", async () => {
      mockAuth.mockResolvedValue(null);

      expect(await blockUser("user-2")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns false when caller lacks permission", async () => {
      mockGetUserRole.mockResolvedValue("user");

      expect(await blockUser("user-2")).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("unblockUser", () => {
    it("unblocks a user when caller is manager", async () => {
      mockGetUserRole.mockResolvedValue("manager");

      const result = await unblockUser("user-2");

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-2" },
        data: { isBlocked: false, updatedAt: expect.any(Date) },
      });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "unblock-user",
        "admin-1",
      );
    });
  });

  describe("isUserBlocked", () => {
    it("returns blocked status for an existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isBlocked: true });

      expect(await isUserBlocked("user-2")).toBe(true);
    });

    it("returns false when lookup fails", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("db error"));

      expect(await isUserBlocked("user-2")).toBe(false);
    });
  });

  describe("deleteUserAccount", () => {
    it("deletes the authenticated user's own account", async () => {
      const result = await deleteUserAccount("admin-1");

      expect(result).toEqual({ error: null });
      expect(mockPrisma.kyc_verifications.deleteMany).toHaveBeenCalledWith({
        where: { user_id: "admin-1" },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "admin-1" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    });

    it("returns error when deleting another user's account", async () => {
      const result = await deleteUserAccount("other-user");

      expect(result).toEqual({
        error: "You can only delete your own account",
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it("returns error when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      expect(await deleteUserAccount("admin-1")).toEqual({
        error: "Not authenticated",
      });
    });
  });

  describe("deleteUserAsAdmin", () => {
    it("deletes a user when caller is admin", async () => {
      const result = await deleteUserAsAdmin("user-2");

      expect(result).toEqual({ error: null });
      expect(mockLogAdminActivity).toHaveBeenCalledWith(
        "delete-user",
        "admin-1",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });

    it("returns error when caller is not admin or manager", async () => {
      mockGetUserRole.mockResolvedValue("user");

      const result = await deleteUserAsAdmin("user-2");

      expect(result).toEqual({
        error: "Unauthorized: Only admins and managers can delete users",
      });
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
