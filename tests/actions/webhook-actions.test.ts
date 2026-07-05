jest.mock("@/lib/prisma", () => ({
  prisma: {
    api_webhooks: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    api_webhook_logs: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/actions/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth-actions";
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  getWebhookLogs,
} from "@/actions/webhook-actions";

const mockPrisma = prisma as unknown as {
  api_webhooks: {
    findMany: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  api_webhook_logs: { findMany: jest.Mock };
};
const mockGetCurrentUser = getCurrentUser as jest.Mock;

const mockUser = { id: "user-1", email: "user@example.com" };

describe("webhook-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
  });

  describe("getWebhooks", () => {
    it("returns webhooks for the authenticated user", async () => {
      const webhooks = [{ id: "wh-1", url: "https://example.com/hook" }];
      mockPrisma.api_webhooks.findMany.mockResolvedValue(webhooks);

      const result = await getWebhooks();

      expect(result).toEqual(webhooks);
      expect(mockPrisma.api_webhooks.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-1" },
        orderBy: { created_at: "desc" },
      });
    });

    it("throws when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getWebhooks()).rejects.toThrow("Unauthorized");
    });
  });

  describe("createWebhook", () => {
    it("creates a webhook and revalidates the path", async () => {
      const created = {
        id: "wh-1",
        url: "https://example.com/hook",
        events: ["donation.created"],
      };
      mockPrisma.api_webhooks.create.mockResolvedValue(created);

      const result = await createWebhook("https://example.com/hook", [
        "donation.created",
      ]);

      expect(result).toEqual(created);
      expect(mockPrisma.api_webhooks.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: "user-1",
          url: "https://example.com/hook",
          events: ["donation.created"],
          is_active: true,
          secret: expect.stringMatching(/^wh_sec_/),
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/developer/webhooks",
      );
    });

    it("throws when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(
        createWebhook("https://example.com/hook", ["donation.created"]),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("deleteWebhook", () => {
    it("deletes the webhook for the authenticated user", async () => {
      mockPrisma.api_webhooks.deleteMany.mockResolvedValue({ count: 1 });

      await deleteWebhook("wh-1");

      expect(mockPrisma.api_webhooks.deleteMany).toHaveBeenCalledWith({
        where: { id: "wh-1", user_id: "user-1" },
      });
      expect(revalidatePath).toHaveBeenCalledWith(
        "/dashboard/developer/webhooks",
      );
    });

    it("throws when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(deleteWebhook("wh-1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("getWebhookLogs", () => {
    it("returns logs scoped to the user", async () => {
      const logs = [{ id: "log-1" }];
      mockPrisma.api_webhook_logs.findMany.mockResolvedValue(logs);

      const result = await getWebhookLogs();

      expect(result).toEqual(logs);
      expect(mockPrisma.api_webhook_logs.findMany).toHaveBeenCalledWith({
        where: { webhook: { user_id: "user-1" } },
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
          webhook: {
            select: { url: true, user_id: true },
          },
        },
      });
    });

    it("filters logs by webhook id when provided", async () => {
      mockPrisma.api_webhook_logs.findMany.mockResolvedValue([]);

      await getWebhookLogs("wh-1", 10);

      expect(mockPrisma.api_webhook_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            webhook: { user_id: "user-1" },
            webhook_id: "wh-1",
          },
          take: 10,
        }),
      );
    });
  });
});
