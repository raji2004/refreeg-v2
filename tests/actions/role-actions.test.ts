jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auth/admin-auth", () => ({
  getUserRole: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    role: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    kyc_verifications: {
      findMany: jest.fn(),
    },
    logs: {
      create: jest.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getUserRoleInfo,
  isAdminOrManager,
  setUserRole,
  listUsersWithRoles,
  getAdminEmails,
} from "@/actions/role-actions";

const mockAuth = auth as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;
const mockPrisma = prisma as unknown as {
  role: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  kyc_verifications: { findMany: jest.Mock };
  logs: { create: jest.Mock };
};

describe("role-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockGetUserRole.mockResolvedValue("admin");
    mockPrisma.logs.create.mockResolvedValue({});
  });

  describe("getUserRoleInfo", () => {
    it("returns role flags for an admin", async () => {
      mockGetUserRole.mockResolvedValue("admin");

      expect(await getUserRoleInfo("user-1")).toEqual({
        isAdmin: true,
        isManager: true,
        role: "admin",
      });
    });

    it("returns manager flags for a manager", async () => {
      mockGetUserRole.mockResolvedValue("manager");

      expect(await getUserRoleInfo("user-1")).toEqual({
        isAdmin: false,
        isManager: true,
        role: "manager",
      });
    });
  });

  describe("isAdminOrManager", () => {
    it("returns true for managers", async () => {
      mockGetUserRole.mockResolvedValue("manager");

      expect(await isAdminOrManager("user-1")).toBe(true);
    });

    it("returns false for regular users", async () => {
      mockGetUserRole.mockResolvedValue("user");

      expect(await isAdminOrManager("user-1")).toBe(false);
    });
  });

  describe("setUserRole", () => {
    it("updates an existing role when caller is admin", async () => {
      mockPrisma.role.findFirst.mockResolvedValue({
        id: "role-1",
        user_id: "user-2",
        role: "user",
      });
      mockPrisma.role.update.mockResolvedValue({});

      const result = await setUserRole("user-2", "manager");

      expect(result).toBe(true);
      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: "role-1" },
        data: { role: "manager", updated_at: expect.any(Date) },
      });
      expect(mockPrisma.logs.create).toHaveBeenCalledWith({
        data: {
          action: "appoint-manager",
          admin_id: "admin-1",
          created_at: expect.any(Date),
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });

    it("creates a role when none exists", async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({});

      const result = await setUserRole("user-2", "admin");

      expect(result).toBe(true);
      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: {
          user_id: "user-2",
          role: "admin",
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });

    it("returns false when caller is not admin", async () => {
      mockGetUserRole.mockResolvedValue("manager");

      expect(await setUserRole("user-2", "manager")).toBe(false);
      expect(mockPrisma.role.update).not.toHaveBeenCalled();
      expect(mockPrisma.role.create).not.toHaveBeenCalled();
    });
  });

  describe("listUsersWithRoles", () => {
    it("returns users enriched with roles and kyc status", async () => {
      const createdAt = new Date("2024-01-01T00:00:00.000Z");
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "user-1",
          email: "user@example.com",
          fullName: "User One",
          username: "userone",
          isBlocked: false,
          createdAt,
        },
      ]);
      mockPrisma.role.findMany.mockResolvedValue([
        { user_id: "user-1", role: "manager" },
      ]);
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([
        { user_id: "user-1", status: "approved", id: "kyc-1" },
      ]);

      const result = await listUsersWithRoles();

      expect(result).toEqual([
        {
          id: "user-1",
          email: "user@example.com",
          role: "manager",
          is_blocked: false,
          full_name: "User One",
          username: "userone",
          created_at: createdAt.toISOString(),
          kyc_status: "approved",
          kyc_verification_id: "kyc-1",
        },
      ]);
    });

    it("throws when caller is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(listUsersWithRoles()).rejects.toThrow("Not authenticated");
    });

    it("throws when caller lacks permission", async () => {
      mockGetUserRole.mockResolvedValue("user");

      await expect(listUsersWithRoles()).rejects.toThrow(
        "Only admins or managers can list users",
      );
    });
  });

  describe("getAdminEmails", () => {
    it("returns admin emails", async () => {
      mockPrisma.role.findMany.mockResolvedValue([{ user_id: "admin-1" }]);
      mockPrisma.user.findMany.mockResolvedValue([
        { email: "admin@example.com" },
      ]);

      expect(await getAdminEmails()).toEqual(["admin@example.com"]);
    });

    it("returns an empty array when no admins exist", async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);

      expect(await getAdminEmails()).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});
