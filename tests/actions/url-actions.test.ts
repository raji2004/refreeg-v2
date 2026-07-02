jest.mock("@/lib/prisma", () => ({
  prisma: {
    short_urls: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/utils", () => ({
  getBaseURL: jest.fn(() => "https://apps.refreeg.com"),
}));

import { prisma } from "@/lib/prisma";
import {
  createShortUrl,
  getOriginalUrl,
  getShortUrlAnalytics,
} from "@/actions/url-actions";

const mockPrisma = prisma as unknown as {
  short_urls: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

describe("url-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createShortUrl", () => {
    it("returns an existing short url when one already exists", async () => {
      mockPrisma.short_urls.findFirst.mockResolvedValue({
        short_code: "abc123",
      });

      const result = await createShortUrl(
        "entity-1",
        "cause",
        "https://example.com/cause/1",
      );

      expect(result).toBe("https://apps.refreeg.com/s/abc123");
      expect(mockPrisma.short_urls.create).not.toHaveBeenCalled();
    });

    it("creates a new short url when none exists", async () => {
      mockPrisma.short_urls.findFirst.mockResolvedValue(null);
      mockPrisma.short_urls.findUnique.mockResolvedValue(null);
      mockPrisma.short_urls.create.mockResolvedValue({});

      const result = await createShortUrl(
        "entity-1",
        "petition",
        "https://example.com/petition/1",
      );

      expect(result).toMatch(/^https:\/\/apps\.refreeg\.com\/s\/[A-Za-z0-9]{6}$/);
      expect(mockPrisma.short_urls.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entity_id: "entity-1",
          entity_type: "petition",
          original_url: "https://example.com/petition/1",
          clicks: 0,
        }),
      });
    });
  });

  describe("getOriginalUrl", () => {
    it("returns the original url and increments clicks", async () => {
      mockPrisma.short_urls.findUnique.mockResolvedValue({
        original_url: "https://example.com/cause/1",
      });
      mockPrisma.short_urls.update.mockResolvedValue({});

      const result = await getOriginalUrl("abc123");

      expect(result).toBe("https://example.com/cause/1");
      expect(mockPrisma.short_urls.update).toHaveBeenCalledWith({
        where: { short_code: "abc123" },
        data: { clicks: { increment: 1 } },
      });
    });

    it("returns null when short code is not found", async () => {
      mockPrisma.short_urls.findUnique.mockResolvedValue(null);

      expect(await getOriginalUrl("missing")).toBeNull();
      expect(mockPrisma.short_urls.update).not.toHaveBeenCalled();
    });
  });

  describe("getShortUrlAnalytics", () => {
    it("returns analytics for an existing short url", async () => {
      mockPrisma.short_urls.findFirst.mockResolvedValue({
        short_code: "abc123",
        clicks: 5,
      });

      const result = await getShortUrlAnalytics("entity-1", "cause");

      expect(result).toEqual({
        clicks: 5,
        shortUrl: "https://apps.refreeg.com/s/abc123",
      });
    });

    it("returns null when no short url exists", async () => {
      mockPrisma.short_urls.findFirst.mockResolvedValue(null);

      expect(await getShortUrlAnalytics("entity-1", "cause")).toBeNull();
    });
  });
});
