/**
 * @jest-environment node
 */
const mockAuthHandler = jest.fn();

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(
    () =>
      (...args: unknown[]) =>
        mockAuthHandler(...args),
  ),
}));

import { NextRequest, type NextFetchEvent } from "next/server";
import middleware from "@/middleware";

const run = (path: string, method = "GET") =>
  middleware(
    new NextRequest(`https://www.refreeg.com${path}`, { method }),
    {} as NextFetchEvent,
  );

describe("middleware source-file probes", () => {
  beforeEach(() => {
    mockAuthHandler.mockReset();
    mockAuthHandler.mockReturnValue(new Response(null, { status: 200 }));
  });

  it.each([
    "/api/auth/pre-signin-cleanup.js",
    "/api/auth/pre-signin-cleanup.ts",
    "/api/payments/verify.js",
    "/api/payments/verify.ts",
    "/api/auth/session.map",
  ])("returns 404 for %s without reaching Auth.js", async (path) => {
    const res = await run(path);
    expect(res?.status).toBe(404);
    expect(mockAuthHandler).not.toHaveBeenCalled();
  });

  it("still passes the real pre-signin-cleanup route to Auth.js", async () => {
    await run("/api/auth/pre-signin-cleanup", "POST");
    expect(mockAuthHandler).toHaveBeenCalled();
  });
});
