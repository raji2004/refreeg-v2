import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";
import { minimalJpeg } from "./helpers/files";

test.describe("RefreeG - Petition Creation Wizard", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);
  });

  test("should complete the 5-step wizard and launch a petition", async ({
    page,
  }) => {
    const petitionTitle = `E2E Petition Test ${Date.now()}`;

    await page.goto("/dashboard/petitions/create");

    await page.getByLabel("Petition Title").fill(petitionTitle);
    await page.getByLabel("Category").selectOption("environment");
    await page.getByLabel("Goal (Signatures)").fill("1000");
    await page.getByRole("button", { name: /Continue/i }).click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByLabel("Cover Image").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(minimalJpeg());

    await page.getByRole("button", { name: /Continue/i }).click();

    await page.getByRole("button", { name: /Add Section/i }).click();
    await page.getByLabel("Section Heading").first().fill("Why this matters");
    await page
      .getByLabel("Section Description")
      .first()
      .fill("This is a critical issue for our community.");
    await page.getByRole("button", { name: /Continue/i }).click();

    await page.getByLabel("Duration").selectOption("30");
    await page.getByRole("button", { name: /Continue/i }).click();

    await expect(page.getByText(petitionTitle)).toBeVisible();
    await expect(page.getByText("1,000")).toBeVisible();

    await page.getByRole("button", { name: /Launch Petition/i }).click();

    await expect(
      page.getByText(/Petition created successfully|Under review/i),
    ).toBeVisible({ timeout: 10_000 });

    if (!page.url().includes("/dashboard/petitions")) {
      await page.goto("/dashboard/petitions");
    }
    await expect(page.getByText(petitionTitle)).toBeVisible();
  });

  test("should show validation errors for missing fields", async ({ page }) => {
    await page.goto("/dashboard/petitions/create");

    await page.getByRole("button", { name: /Continue/i }).click();

    await expect(page.getByText(/Title is required/i)).toBeVisible();
  });
});
