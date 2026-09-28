import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";

test.describe("RefreeG - Organization Settings", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);

    await page.goto("/dashboard/settings/organization");
  });

  test("should update organization workspace details", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Organization/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Organisation name/i)).toBeVisible();

    const newName = `E2E Org Update ${Date.now()}`;
    await page.getByLabel(/Organisation name/i).fill(newName);

    await page
      .getByLabel(/Organisation bio/i)
      .fill("This is an updated E2E test bio for our organization.");

    await page.getByLabel(/Industry/i).fill("Technology");

    await page.getByRole("button", { name: /Save changes/i }).click();

    await expect(page.getByText(/Settings saved successfully/i)).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await expect(page.getByLabel(/Organisation name/i)).toHaveValue(newName);
  });

  test("should invite a team member and see them in the list", async ({
    page,
  }) => {
    const inviteEmail = `team-e2e-${Date.now()}@refreeg.internal`;

    await page.getByLabel(/Invite email/i).fill(inviteEmail);
    await page.getByLabel(/Role/i).selectOption("member");

    await page.getByRole("button", { name: /Send invitation/i }).click();

    await expect(page.getByText(/Invitation sent successfully/i)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(inviteEmail)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Pending/i)).toBeVisible();
  });

  test("should revoke a pending invitation", async ({ page }) => {
    const pendingRow = page
      .locator("tr")
      .filter({ hasText: /Pending/i })
      .first();

    if ((await pendingRow.count()) > 0) {
      await pendingRow.getByRole("button", { name: /Revoke|Cancel/i }).click();

      await page.getByRole("button", { name: /Confirm Revoke/i }).click();

      await expect(pendingRow).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Invitation revoked/i)).toBeVisible();
    }
  });

  test("should upload an organization logo", async ({ page }) => {
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByLabel(/Upload logo|Change logo/i).click();
    const fileChooser = await fileChooserPromise;

    const { minimalJpeg } = await import("./helpers/files");
    await fileChooser.setFiles(minimalJpeg());

    await expect(page.getByText(/Logo uploaded successfully/i)).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.locator("img[alt*='logo']")).toBeVisible();
  });
});
