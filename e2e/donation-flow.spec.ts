import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";
import { fillCreateCauseWizard } from "./helpers/cause-form";

test.describe("RefreeG - Donation Flow (Webhook Mocked)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let causeId: string;
  let causeSlug: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);
  });

  test("should create a cause, donate via UI, and verify success via webhook mock", async ({
    page,
  }) => {
    const causeTitle = `E2E Donation Test ${Date.now()}`;

    await page.goto("/dashboard/causes/create");
    await fillCreateCauseWizard(page, { title: causeTitle });

    await page.waitForURL(/\/causes\/[a-f0-9-]+/);

    const urlParts = page.url().split("/");
    causeId = urlParts[urlParts.length - 1];
    const currentPath = new URL(page.url()).pathname;
    causeSlug = currentPath.split("/").pop() || causeId;

    await page.goto(`/causes/${causeSlug}/donate`);

    await expect(page.getByRole("heading", { name: causeTitle })).toBeVisible();

    await page.getByLabel("Amount").fill("5000");
    await page.getByLabel("Full Name").fill("E2E Donor");
    await page.getByLabel("Email").fill("donor-e2e@refreeg.internal");
    await page.getByLabel("Message (Optional)").fill("Keep up the great work!");

    const payButton = page.getByRole("button", {
      name: /Pay with Paystack|Donate Now/i,
    });
    await payButton.click();

    await expect(
      page.getByText(/processing|redirecting|waiting for payment/i),
    ).toBeVisible({ timeout: 10_000 });

    const fakeReference = `e2e_ref_${Date.now()}`;

    await page.request.post("/api/webhooks/paystack", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        event: "charge.success",
        data: {
          reference: fakeReference,
          status: "success",
          amount: 500000,
          metadata: {
            cause_id: causeId,
            donor_name: "E2E Donor",
            donor_email: "donor-e2e@refreeg.internal",
            message: "Keep up the great work!",
          },
        },
      },
    });

    await expect(
      page.getByText(/thank you|payment successful|donation recorded/i),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("E2E Donor")).toBeVisible();

    await page.reload();
    await expect(page.getByText(/5,000/i)).toBeVisible();
  });
});
