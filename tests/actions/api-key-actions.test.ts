/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    api_keys: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/utils/api-bot/api-keys", () => ({
  generateApiKey: jest.fn(() => ({
    fullKey: "rg_test_sk_abc123",
    displayPrefix: "rg_test_sk_abc",
  })),
  hashApiKey: jest.fn(() => "hashed-key"),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  createApiKey,
  getApiKeys,
  revokeApiKey,
} from "@/actions/api-key-actions";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  api_keys: {
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

describe("api-key-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createApiKey", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(createApiKey("My Key", "test")).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("throws when user is not a developer", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.user.findUnique.mockResolvedValue({ accountType: "individual" });

      await expect(createApiKey("My Key", "test")).rejects.toThrow(
        "Only developers can create API keys",
      );
    });

    it("creates an API key and returns raw key once", async () => {
      mockAuth.mockResolvedValue({ user: { id: "dev-1" } });
      mockPrisma.user.findUnique.mockResolvedValue({ accountType: "developer" });
      mockPrisma.api_keys.create.mockResolvedValue({
        id: "key-1",
        name: "My Key",
        key_prefix: "rg_test_sk_abc",
        mode: "test",
      });

      const result = await createApiKey("My Key", "test");

      expect(result.rawKey).toBe("rg_test_sk_abc123");
      expect(mockPrisma.api_keys.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: "dev-1",
          name: "My Key",
          key_hash: "hashed-key",
          mode: "test",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/developer/api-keys",
      );
    });
  });

  describe("getApiKeys", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(getApiKeys()).rejects.toThrow("Unauthorized");
    });

    it("returns active API keys for the user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "dev-1" } });
      const keys = [{ id: "key-1", name: "Key 1" }];
      mockPrisma.api_keys.findMany.mockResolvedValue(keys);

      const result = await getApiKeys();

      expect(result).toEqual(keys);
      expect(mockPrisma.api_keys.findMany).toHaveBeenCalledWith({
        where: { user_id: "dev-1", revoked_at: null },
        orderBy: { created_at: "desc" },
      });
    });
  });

  describe("revokeApiKey", () => {
    it("throws when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(revokeApiKey("key-1")).rejects.toThrow("Unauthorized");
    });

    it("revokes the API key for the authenticated user", async () => {
      mockAuth.mockResolvedValue({ user: { id: "dev-1" } });
      mockPrisma.api_keys.update.mockResolvedValue({ id: "key-1" });

      const result = await revokeApiKey("key-1");

      expect(result).toBe(true);
      expect(mockPrisma.api_keys.update).toHaveBeenCalledWith({
        where: { id: "key-1", user_id: "dev-1" },
        data: { revoked_at: expect.any(Date) },
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/developer/api-keys",
      );
    });
  });
});
