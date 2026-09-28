import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";

test.describe("RefreeG - Petition Signing Flow", () => {
  test.setTimeout(60_000);

  const PETITION_SLUG = "save-our-local-park";

  test("should sign a petition and see success message", async ({ page }) => {
    await page.goto(`/petitions/${PETITION_SLUG}`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("button", { name: /Sign Petition/i }).click();

    await page.getByLabel("Full Name").fill("E2E Tester");
    await page
      .getByLabel("Email Address")
      .fill(`e2e-test-${Date.now()}@refreeg.internal`);
    await page
      .getByLabel("Why do you support this?")
      .fill("This is a crucial cause for our community.");

    await page.getByRole("button", { name: /Submit Signature/i }).click();

    await expect(page.getByText(/Thank you for signing/i)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(/signature/i)).toBeVisible();
  });

  test("should prevent duplicate signatures from the same email", async ({
    page,
  }) => {
    const uniqueEmail = `duplicate-test-${Date.now()}@refreeg.internal`;

    await page.goto(`/petitions/${PETITION_SLUG}`);
    await page.getByRole("button", { name: /Sign Petition/i }).click();
    await page.getByLabel("Full Name").fill("First Signer");
    await page.getByLabel("Email Address").fill(uniqueEmail);
    await page
      .getByLabel("Why do you support this?")
      .fill("First time signing.");
    await page.getByRole("button", { name: /Submit Signature/i }).click();
    await expect(page.getByText(/Thank you for signing/i)).toBeVisible();

    await page.goto(`/petitions/${PETITION_SLUG}`);
    await page.getByRole("button", { name: /Sign Petition/i }).click();
    await page.getByLabel("Full Name").fill("Second Signer");
    await page.getByLabel("Email Address").fill(uniqueEmail);
    await page
      .getByLabel("Why do you support this?")
      .fill("Trying to sign again.");
    await page.getByRole("button", { name: /Submit Signature/i }).click();

    await expect(page.getByText(/already signed/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
