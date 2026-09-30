import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";

test.describe("RefreeG - Admin API Monitoring", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);
  });

  test("should view API monitoring dashboard and see summary stats", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/api-monitoring");

    await expect(
      page.getByRole("heading", { name: /API Monitoring/i }),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Campaigns/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Donations/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reports/i })).toBeVisible();
    await expect(page.getByText(/Active Keys|Total Keys/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Request Volume|Error Rate/i)).toBeVisible();
  });

  test("should list API campaigns and take one down", async ({ page }) => {
    await page.goto("/dashboard/admin/api-monitoring/campaigns");

    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    const campaignTitle = await firstRow.locator("td").nth(1).innerText();

    await firstRow.getByRole("button", { name: /Actions/i }).click();

    await page.getByRole("menuitem", { name: /Take Down/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Reason for takedown").fill("E2E Test Takedown");
    await page.getByRole("button", { name: /Confirm Takedown/i }).click();

    await expect(
      page.getByText(/Campaign taken down successfully/i),
    ).toBeVisible({ timeout: 5_000 });

    await expect(firstRow.getByText(/Cancelled|Taken Down/i)).toBeVisible();
  });

  test("should view API donation records", async ({ page }) => {
    await page.goto("/dashboard/admin/api-monitoring/donations");

    await expect(page.getByRole("table")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Amount/i)).toBeVisible();
    await expect(page.getByText(/Fee Revenue/i)).toBeVisible();
    await expect(page.getByText(/Status/i)).toBeVisible();
  });

  test("should view and resolve campaign reports", async ({ page }) => {
    await page.goto("/dashboard/admin/api-monitoring/reports");

    await expect(
      page.getByRole("heading", { name: /Campaign Reports/i }),
    ).toBeVisible();

    const reportTable = page.getByRole("table");
    if (await reportTable.isVisible()) {
      const firstReportRow = page.locator("tbody tr").first();
      if (await firstReportRow.isVisible()) {
        await firstReportRow.getByRole("button", { name: /Actions/i }).click();
        await page.getByRole("menuitem", { name: /Resolve/i }).click();

        await page
          .getByLabel("Resolution Notes")
          .fill("Resolved via E2E test.");
        await page.getByRole("button", { name: /Submit Resolution/i }).click();

        await expect(page.getByText(/Report resolved/i)).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  });
});
