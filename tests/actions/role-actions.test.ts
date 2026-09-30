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
      count: jest.fn(),
    },
    kyc_verifications: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
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
  listUsersWithRolesPage,
  getPendingKycSummary,
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
    count: jest.Mock;
  };
  kyc_verifications: { findMany: jest.Mock; groupBy: jest.Mock };
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

  describe("listUsersWithRolesPage", () => {
    const row = (id: string, overrides: Record<string, unknown> = {}) => ({
      id,
      email: `${id}@example.com`,
      fullName: id,
      username: id,
      isBlocked: false,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      ...overrides,
    });

    beforeEach(() => {
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([]);
    });

    it("returns one page with the total and looks roles up for that page only", async () => {
      mockPrisma.user.findMany.mockResolvedValue([row("u1"), row("u2")]);
      mockPrisma.user.count.mockResolvedValue(60);
      mockPrisma.role.findMany.mockResolvedValue([
        { user_id: "u2", role: "manager" },
      ]);

      const result = await listUsersWithRolesPage({ page: 2, pageSize: 25 });

      expect(result.total).toBe(60);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
      expect(result.users.map((u) => [u.id, u.role])).toEqual([
        ["u1", "user"],
        ["u2", "manager"],
      ]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      );
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: { in: ["u1", "u2"] } },
        }),
      );
    });

    it("searches email and name in the database and counts with the same filter", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await listUsersWithRolesPage({ search: "  Ada " });

      const expectedWhere = {
        OR: [
          { email: { contains: "Ada", mode: "insensitive" } },
          { fullName: { contains: "Ada", mode: "insensitive" } },
        ],
      };
      expect(mockPrisma.user.findMany.mock.calls[0][0].where).toEqual(
        expectedWhere,
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it("skips role and KYC lookups when the page is empty", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await listUsersWithRolesPage();

      expect(result).toMatchObject({ users: [], total: 0, totalPages: 1 });
      expect(mockPrisma.role.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.kyc_verifications.findMany).not.toHaveBeenCalled();
    });

    it("clamps bad paging input", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await listUsersWithRolesPage({ page: 0, pageSize: 9999 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
    });

    it("requires an admin or manager", async () => {
      mockGetUserRole.mockResolvedValue("user");

      await expect(listUsersWithRolesPage()).rejects.toThrow(
        "Only admins or managers can list users",
      );
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe("listUsersWithRoles batching", () => {
    it("reads users in bounded batches instead of one giant query", async () => {
      const batch = (start: number, n: number) =>
        Array.from({ length: n }, (_, i) => ({
          id: `u${start + i}`,
          email: null,
          fullName: null,
          username: null,
          isBlocked: null,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
        }));
      mockPrisma.user.findMany
        .mockResolvedValueOnce(batch(0, 500))
        .mockResolvedValueOnce(batch(500, 120));
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([]);

      const result = await listUsersWithRoles();

      expect(result).toHaveLength(620);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.findMany.mock.calls[1][0]).toMatchObject({
        skip: 500,
        take: 500,
      });
      for (const [args] of mockPrisma.role.findMany.mock.calls) {
        expect(args.where.user_id.in.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe("getPendingKycSummary", () => {
    const at = (iso: string) => new Date(iso);

    it("counts only users whose latest KYC is still pending", async () => {
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([
        { user_id: "u1", created_at: at("2024-03-01") },
        { user_id: "u2", created_at: at("2024-02-01") },
      ]);
      mockPrisma.kyc_verifications.groupBy.mockResolvedValue([
        { user_id: "u1", _max: { created_at: at("2024-03-01") } },
        { user_id: "u2", _max: { created_at: at("2024-04-01") } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }]);

      const result = await getPendingKycSummary();

      expect(result).toEqual({ count: 1, firstUserId: "u1" });
      expect(mockPrisma.user.findMany.mock.calls[0][0].where.id).toEqual({
        in: ["u1"],
      });
    });

    it("applies the search filter to the pending users", async () => {
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([
        { user_id: "u1", created_at: at("2024-03-01") },
      ]);
      mockPrisma.kyc_verifications.groupBy.mockResolvedValue([
        { user_id: "u1", _max: { created_at: at("2024-03-01") } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getPendingKycSummary("nobody");

      expect(result).toEqual({ count: 0, firstUserId: null });
      expect(mockPrisma.user.findMany.mock.calls[0][0].where.OR).toBeDefined();
    });

    it("returns zero without more queries when nothing is pending", async () => {
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([]);

      expect(await getPendingKycSummary()).toEqual({
        count: 0,
        firstUserId: null,
      });
      expect(mockPrisma.kyc_verifications.groupBy).not.toHaveBeenCalled();
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
