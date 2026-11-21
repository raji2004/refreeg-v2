/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/cron/send-announcements/route";
import { processDueAnnouncements } from "@/lib/email/announcement-sender";

jest.mock("@/lib/email/announcement-sender", () => ({
  processDueAnnouncements: jest.fn(),
}));

const mockProcess = processDueAnnouncements as jest.Mock;

const request = (authorization?: string) =>
  new NextRequest("http://localhost/api/cron/send-announcements", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });

const env = process.env as Record<string, string | undefined>;
const originalEnv = { secret: env.CRON_SECRET, node: env.NODE_ENV };

beforeEach(() => {
  delete env.CRON_SECRET;
  mockProcess.mockResolvedValue({ processed: 2 });
});

afterAll(() => {
  env.CRON_SECRET = originalEnv.secret;
  env.NODE_ENV = originalEnv.node;
});

describe("send-announcements cron", () => {
  it("sends what is due and reports how many", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, processed: 2 });
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong secret without sending anything", async () => {
    env.CRON_SECRET = "secret";
    const res = await POST(request("Bearer nope"));
    expect(res.status).toBe(401);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it("accepts the right secret", async () => {
    env.CRON_SECRET = "secret";
    expect((await POST(request("Bearer secret"))).status).toBe(200);
  });

  it("refuses to run in production when no secret is configured", async () => {
    env.NODE_ENV = "production";
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(mockProcess).not.toHaveBeenCalled();
    env.NODE_ENV = originalEnv.node;
  });
});
