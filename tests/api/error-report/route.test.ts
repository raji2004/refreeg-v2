/**
 * @jest-environment node
 */
jest.mock("@/lib/refreeg-alert-reporter", () => ({
  reportToRefreegAlert: jest.fn(),
}));

import { POST } from "@/app/api/error-report/route";
import { reportToRefreegAlert } from "@/lib/refreeg-alert-reporter";

function request(
  body: unknown,
  origin = "https://www.refreeg.com",
  ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
) {
  return new Request("https://www.refreeg.com/api/error-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "www.refreeg.com",
      origin,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/error-report", () => {
  beforeEach(() => jest.clearAllMocks());

  it("forwards a valid same-origin browser error", async () => {
    (reportToRefreegAlert as jest.Mock).mockResolvedValue(true);
    const response = await POST(request({
      type: "window",
      name: "TypeError",
      message: "Something failed",
      path: "/causes",
    }) as never);

    expect(response.status).toBe(202);
    expect(reportToRefreegAlert).toHaveBeenCalledWith(expect.objectContaining({
      source: "browser",
      name: "TypeError",
      message: "Something failed",
    }));
  });

  it("rejects reports from another origin", async () => {
    const response = await POST(request({
      type: "window",
      message: "Something failed",
    }, "https://attacker.example") as never);

    expect(response.status).toBe(403);
    expect(reportToRefreegAlert).not.toHaveBeenCalled();
  });

  it("rejects a matching host when the origin protocol differs", async () => {
    const response = await POST(request({
      type: "window",
      message: "Something failed",
    }, "http://www.refreeg.com") as never);

    expect(response.status).toBe(403);
    expect(reportToRefreegAlert).not.toHaveBeenCalled();
  });

  it("rejects malformed reports", async () => {
    const response = await POST(request({ type: "window" }) as never);
    expect(response.status).toBe(400);
    expect(reportToRefreegAlert).not.toHaveBeenCalled();
  });

  it("rate limits reports by client IP", async () => {
    (reportToRefreegAlert as jest.Mock).mockResolvedValue(true);
    const body = { type: "window", message: "Repeated failure" };
    const ip = "198.51.100.10";

    for (let index = 0; index < 20; index += 1) {
      const response = await POST(request(body, undefined, ip) as never);
      expect(response.status).toBe(202);
    }

    const response = await POST(request(body, undefined, ip) as never);
    expect(response.status).toBe(429);
  });

  it("returns 503 when RefreeG Alert is unavailable", async () => {
    (reportToRefreegAlert as jest.Mock).mockResolvedValue(false);
    const response = await POST(request({
      type: "react",
      message: "Render failed",
    }) as never);

    expect(response.status).toBe(503);
  });
});
