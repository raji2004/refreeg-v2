/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: { cause: { findMany: jest.fn() } },
}));
jest.mock("@/lib/media/cause-image-render", () => ({
  warmCauseImage: jest.fn(),
}));

import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/cron/warm-cause-images/route";
import { prisma } from "@/lib/prisma";
import { warmCauseImage } from "@/lib/media/cause-image-render";

const findMany = (prisma as any).cause.findMany as jest.Mock;
const warm = warmCauseImage as jest.Mock;

const token = (secret: string) =>
  createHash("sha256").update(`refreeg-cache-warm:${secret}`).digest("hex");

const request = (auth?: string) =>
  new NextRequest("http://localhost/api/cron/warm-cause-images", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });

describe("POST /api/cron/warm-cause-images", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
  });
  afterAll(() => {
    process.env.AUTH_SECRET = original;
  });

  it("rejects missing or wrong tokens", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("Bearer nope"))).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("stays closed when AUTH_SECRET is unset", async () => {
    const valid = `Bearer ${token("test-secret")}`;
    delete process.env.AUTH_SECRET;
    expect((await POST(request(valid))).status).toBe(401);
  });

  it("warms each distinct cover once and reports counts", async () => {
    findMany.mockResolvedValue([
      { image: "a" },
      { image: "b" },
      { image: "a" },
      { image: "c" },
    ]);
    warm
      .mockResolvedValueOnce("rendered")
      .mockResolvedValueOnce("cached")
      .mockRejectedValueOnce(new Error("s3 down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(request(`Bearer ${token("test-secret")}`));

    expect(res.status).toBe(200);
    expect(warm).toHaveBeenCalledTimes(3);
    await expect(res.json()).resolves.toEqual({
      total: 3,
      rendered: 1,
      cached: 1,
      skipped: 0,
      failed: 1,
    });
  });
});
