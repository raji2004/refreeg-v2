import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";
import { fillCreateCauseWizard } from "./helpers/cause-form";
import { minimalJpeg } from "./helpers/files";

test.describe("RefreeG - Admin Moderation Flow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let causeId: string;
  let causeTitle: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);
  });

  test("should create a cause, approve it as admin, and verify it goes live", async ({
    page,
  }) => {
    causeTitle = `E2E Admin Test ${Date.now()}`;

    await page.goto("/dashboard/causes/create");
    await fillCreateCauseWizard(page, { title: causeTitle });

    await page.waitForURL(/\/dashboard\/causes\/[^/]+$/);
    const urlParts = page.url().split("/");
    causeId = urlParts[urlParts.length - 1];

    await expect(page.getByText(/Pending Review|Under Review/i)).toBeVisible();

    await page.goto("/dashboard/admin/causes");

    const causeRow = page.locator("tr").filter({ hasText: causeTitle }).first();
    await expect(causeRow).toBeVisible({ timeout: 10_000 });

    await causeRow.getByRole("button", { name: /Actions/i }).click();
    await page.getByRole("menuitem", { name: /Approve/i }).click();

    const confirmBtn = page.getByRole("button", {
      name: /Confirm Approve|Yes, Approve/i,
    });
    if (await confirmBtn.isVisible({ timeout: 2_000 })) {
      await confirmBtn.click();
    }

    await expect(page.getByText(/Cause approved successfully/i)).toBeVisible({
      timeout: 5_000,
    });

    await page.goto(`/causes/${causeId}`);

    await expect(page.getByText(/Pending Review/i)).not.toBeVisible();

    await expect(page.getByRole("button", { name: /Donate/i })).toBeVisible();
  });

  test("should reject a cause and notify the user", async ({ page }) => {
    const rejectTitle = `E2E Reject Test ${Date.now()}`;
    await page.goto("/dashboard/causes/create");
    await fillCreateCauseWizard(page, { title: rejectTitle });
    await page.waitForURL(/\/dashboard\/causes\/[^/]+$/);
    const rejectUrl = page.url();
    const rejectId = rejectUrl.split("/").pop();

    await page.goto("/dashboard/admin/causes");
    const rejectRow = page
      .locator("tr")
      .filter({ hasText: rejectTitle })
      .first();
    await expect(rejectRow).toBeVisible({ timeout: 10_000 });

    await rejectRow.getByRole("button", { name: /Actions/i }).click();
    await page.getByRole("menuitem", { name: /Reject/i }).click();

    await page.getByLabel("Rejection Reason").fill("Incomplete documentation.");
    await page.getByRole("button", { name: /Confirm Reject/i }).click();

    await expect(page.getByText(/Cause rejected/i)).toBeVisible();

    await page.goto(rejectUrl);
    await expect(page.getByText(/Rejected/i)).toBeVisible();
    await expect(page.getByText(/Incomplete documentation/i)).toBeVisible();

    await expect(
      page.getByRole("button", { name: /Edit Cause|Resubmit/i }),
    ).toBeVisible();
  });
});
