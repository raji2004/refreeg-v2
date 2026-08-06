import { expect, test } from "@playwright/test";

test.describe("organization signup", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (error) => console.error("[browser page error]", error.message));
    page.on("console", (message) => {
      if (message.type() === "error") console.error("[browser console]", message.text());
    });
    await page.goto("/auth/signup");
    const organizationOption = page.locator('button[aria-pressed]').filter({ hasText: "Organization" });
    await expect(organizationOption).toBeVisible();
    await organizationOption.click();
    await expect(organizationOption).toHaveAttribute("aria-pressed", "true");
  });

  test("shows organization fields and missing-field errors", async ({ page }) => {
    await page.getByRole("button", { name: /^Sign Up$/ }).click();

    await expect(page.getByText("Admin or primary contact name is required")).toBeVisible();
    await expect(page.getByText("Organization name is required")).toBeVisible();
    await expect(page.getByText("Organization phone number is required")).toBeVisible();
    await expect(page.getByText("Organization address is required")).toBeVisible();
    await expect(page.getByText("Industry is required")).toBeVisible();
    await expect(page.getByText("Email address is required")).toBeVisible();
  });

  test("rejects invalid email and a weak password", async ({ page }) => {
    await page.locator("#fullName").fill("Ada Lovelace");
    await page.locator("#organizationName").fill("Hope & Health Initiative");
    await page.locator("#organizationIndustry").fill("Public Health");
    await page.locator("#organizationPhone").fill("+234 801 234 5678");
    await page.locator("#organizationAddress").fill("12 Unity Road, Lagos");
    await page.locator("#email").fill("invalid-email");
    await page.locator("#password").fill("12345678");
    await page.locator("#confirmPassword").fill("12345678");
    await page.getByRole("button", { name: /^Sign Up$/ }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("At least 10 characters").last()).toHaveClass(/text-red-500/);
  });

  test("submits valid details and preserves an invitation redirect", async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined;
    await page.route("**/api/auth/register-pending", async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "OTP sent successfully." }),
      });
    });
    await page.goto("/auth/signup?redirect=%2Forganization%2Finvitations%2Fsample-token");
    const organizationOption = page.locator('button[aria-pressed]').filter({ hasText: "Organization" });
    await organizationOption.click();
    await expect(organizationOption).toHaveAttribute("aria-pressed", "true");
    await page.locator("#fullName").fill("Ada Lovelace");
    await page.locator("#organizationName").fill("Hope & Health Initiative (QA)");
    await page.locator("#organizationIndustry").fill("Public Health");
    await page.locator("#organizationPhone").fill("+234 801 234 5678");
    await page.locator("#organizationAddress").fill("12 Unity Road, Lagos");
    await page.locator("#email").fill("ADMIN@EXAMPLE.ORG");
    await page.locator("#password").fill("Strong!Pass2026");
    await page.locator("#confirmPassword").fill("Strong!Pass2026");
    await page.getByRole("button", { name: /^Sign Up$/ }).click();

    await expect(page).toHaveURL(/\/auth\/verify-otp\?email=admin%40example\.org.*redirect=/);
    expect(submittedBody).toMatchObject({
      accountType: "organization",
      email: "admin@example.org",
      organizationName: "Hope & Health Initiative (QA)",
    });
  });
});
