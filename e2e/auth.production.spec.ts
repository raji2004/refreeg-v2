import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";

test.describe("RefreeG Production — Auth", () => {
  test.setTimeout(120_000);

  test("should sign in and land on dashboard", async ({ page }) => {
    await signIn(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Welcome back/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /Create cause/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Manage Causes/i }).first()).toBeVisible();
    console.log(`Dashboard ready for ${TEST_EMAIL}`);
  });

  test("should show sign-in form fields when logged out", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/auth/signin", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign In$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });
});
