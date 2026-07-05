import { test, expect } from "@playwright/test";

test.describe("production sanity", () => {
  test("health endpoint responds with JSON", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("services");
    expect(body).toHaveProperty("timestamp");
    expect(body.services).toHaveProperty("database");
    expect(body.services).toHaveProperty("bookings");
    expect(body.services).toHaveProperty("payments");
    expect([200, 401, 503]).toContain(response.status());
  });

  test("database health endpoint responds with JSON", async ({ request }) => {
    const response = await request.get("/api/health/database");
    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("latencyMs");
    expect(body).toHaveProperty("timestamp");
    expect(typeof body.latencyMs).toBe("number");
    expect([200, 401, 503]).toContain(response.status());
  });
});
