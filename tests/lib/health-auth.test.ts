/**
 * @jest-environment node
 */
import { isHealthCheckAuthorized } from "@/lib/health/checks";

describe("isHealthCheckAuthorized", () => {
  const originalToken = process.env.HEALTH_CHECK_TOKEN;

  beforeEach(() => {
    delete process.env.HEALTH_CHECK_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.HEALTH_CHECK_TOKEN;
    } else {
      process.env.HEALTH_CHECK_TOKEN = originalToken;
    }
  });

  it("allows requests when no token is configured", () => {
    const request = new Request("http://localhost:3000/api/health");
    expect(isHealthCheckAuthorized(request)).toBe(true);
  });

  it("rejects requests without a token when one is configured", () => {
    process.env.HEALTH_CHECK_TOKEN = "secret-token";
    const request = new Request("http://localhost:3000/api/health");

    expect(isHealthCheckAuthorized(request)).toBe(false);
  });

  it("accepts bearer token authorization", () => {
    process.env.HEALTH_CHECK_TOKEN = "secret-token";
    const request = new Request("http://localhost:3000/api/health", {
      headers: {
        Authorization: "Bearer secret-token",
      },
    });

    expect(isHealthCheckAuthorized(request)).toBe(true);
  });

  it("accepts x-health-check-token header", () => {
    process.env.HEALTH_CHECK_TOKEN = "secret-token";
    const request = new Request("http://localhost:3000/api/health", {
      headers: {
        "x-health-check-token": "secret-token",
      },
    });

    expect(isHealthCheckAuthorized(request)).toBe(true);
  });

  it("rejects invalid bearer token values", () => {
    process.env.HEALTH_CHECK_TOKEN = "secret-token";
    const request = new Request("http://localhost:3000/api/health", {
      headers: {
        Authorization: "Bearer wrong-token",
      },
    });

    expect(isHealthCheckAuthorized(request)).toBe(false);
  });

  it("treats whitespace-only configured token as disabled auth", () => {
    process.env.HEALTH_CHECK_TOKEN = "   ";
    const request = new Request("http://localhost:3000/api/health");

    expect(isHealthCheckAuthorized(request)).toBe(true);
  });
});
