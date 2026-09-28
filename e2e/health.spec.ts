import { test, expect } from "@playwright/test";

test.describe("production sanity", () => {
  test("health endpoint responds with JSON", async ({ request }) => {
    const response = await request.get("/api/health");

    const contentType = response.headers()["content-type"] || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        `Expected JSON but got ${contentType}: ${text.slice(0, 200)}`,
      );
    }

    const body = await response.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("services");
  });

  test("database health endpoint responds with JSON", async ({ request }) => {
    const response = await request.get("/api/health/database");
    const body = await response.json();

    expect(body).toHaveProperty("status");
  });
});
