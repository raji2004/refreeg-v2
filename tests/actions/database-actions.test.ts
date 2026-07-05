jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    logs: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/actions/role-actions", () => ({
  ensureDefaultAdmin: jest.fn(),
  isAdminOrManager: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultAdmin,
  isAdminOrManager,
} from "@/actions/role-actions";
import {
  checkTableExists,
  checkDatabaseSetup,
  logAdminActivity,
  listAdminLogs,
  getRecentAdminActions,
  getAdminActionStats,
} from "@/actions/database-actions";

const mockAuth = auth as jest.Mock;
const mockEnsureDefaultAdmin = ensureDefaultAdmin as jest.Mock;
const mockIsAdminOrManager = isAdminOrManager as jest.Mock;
const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  logs: {
    create: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
  user: { findMany: jest.Mock };
};

describe("database-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockIsAdminOrManager.mockResolvedValue(true);
    mockEnsureDefaultAdmin.mockResolvedValue(undefined);
    mockPrisma.logs.create.mockResolvedValue({});
  });

  describe("checkTableExists", () => {
    it("returns true when the table exists", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

      expect(await checkTableExists("users")).toBe(true);
    });

    it("returns false when the query fails", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("db error"));

      expect(await checkTableExists("users")).toBe(false);
    });
  });

  describe("checkDatabaseSetup", () => {
    it("returns ready when all required tables exist", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }]);

      const result = await checkDatabaseSetup();

      expect(result).toEqual({ ready: true, missingTables: [] });
      // ensureDefaultAdmin only runs when typeof window === "undefined" (server).
      // Jest's jsdom environment defines window, so it is skipped here.
      expect(mockEnsureDefaultAdmin).not.toHaveBeenCalled();
    });

    it("returns missing tables when checks fail", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: false }]);

      const result = await checkDatabaseSetup();

      expect(result.ready).toBe(false);
      expect(result.missingTables).toHaveLength(5);
      expect(mockEnsureDefaultAdmin).not.toHaveBeenCalled();
    });
  });

  describe("logAdminActivity", () => {
    it("creates a log entry", async () => {
      await logAdminActivity("block-user", "admin-1");

      expect(mockPrisma.logs.create).toHaveBeenCalledWith({
        data: {
          action: "block-user",
          admin_id: "admin-1",
          created_at: expect.any(Date),
        },
      });
    });

    it("does not throw when logging fails", async () => {
      mockPrisma.logs.create.mockRejectedValue(new Error("db error"));

      await expect(
        logAdminActivity("block-user", "admin-1"),
      ).resolves.toBeUndefined();
    });
  });

  describe("listAdminLogs", () => {
    it("returns logs enriched with admin emails", async () => {
      const createdAt = new Date("2024-06-01T12:00:00.000Z");
      mockPrisma.logs.findMany.mockResolvedValue([
        {
          id: "log-1",
          action: "block-user",
          admin_id: "admin-1",
          created_at: createdAt,
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "admin-1", email: "admin@example.com", fullName: "Admin" },
      ]);

      const result = await listAdminLogs(10);

      expect(result).toEqual([
        {
          email: "admin@example.com",
          action: "block-user",
          created_at: createdAt.toISOString(),
        },
      ]);
    });

    it("throws when caller is unauthorized", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(listAdminLogs()).rejects.toThrow("Unauthorized");
    });

    it("throws when caller lacks admin or manager role", async () => {
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(listAdminLogs()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });
  });

  describe("getRecentAdminActions", () => {
    it("returns recent actions for authorized users", async () => {
      const logs = [{ id: "log-1", action: "block-user" }];
      mockPrisma.logs.findMany.mockResolvedValue(logs);

      expect(await getRecentAdminActions(5)).toEqual(logs);
    });

    it("returns an empty array when session is missing", async () => {
      mockAuth.mockResolvedValue(null);

      expect(await getRecentAdminActions()).toEqual([]);
    });
  });

  describe("getAdminActionStats", () => {
    it("returns grouped action counts", async () => {
      mockPrisma.logs.groupBy.mockResolvedValue([
        { action: "block-user", _count: { id: 3 } },
      ]);

      const result = await getAdminActionStats(30);

      expect(result).toEqual([{ action: "block-user", count: 3 }]);
    });

    it("throws when caller lacks permission", async () => {
      mockIsAdminOrManager.mockResolvedValue(false);

      await expect(getAdminActionStats()).rejects.toThrow(
        "Unauthorized: Admin or Manager role required",
      );
    });
  });
});
