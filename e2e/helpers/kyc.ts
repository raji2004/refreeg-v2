import { expect, type Page } from "@playwright/test";
import { TEST_EMAIL } from "./auth";
import { minimalPdf } from "./files";

/**
 * Reject/approve redirects to /dashboard/admin/users?kyc_alert=...
 * Must not match the review URL /dashboard/admin/users/kyc/:id (prefix trap).
 */
async function waitForAdminUsersKycAlert(
  page: Page,
  alert: "rejected" | "approved",
) {
  await page.waitForURL(
    (url) => {
      const path = url.pathname.replace(/\/$/, "");
      return (
        path === "/dashboard/admin/users" &&
        url.searchParams.get("kyc_alert") === alert
      );
    },
    { timeout: 60_000 },
  );
}

/**
 * Opens the admin KYC review page for a given user email.
 */
export async function openKycAdminReviewForEmail(
  page: Page,
  email = TEST_EMAIL,
) {
  await page.goto("/dashboard/admin/users/kyc", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(
    page.getByRole("heading", { name: /KYC Reviews/i }),
  ).toBeVisible({ timeout: 30_000 });

  const row = page.locator("table tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  const review = row.getByRole("link", { name: /Review/i }).or(
    row.getByRole("button", { name: /Review/i }),
  );
  await review.first().click();
  await page.waitForURL(
    (url) =>
      /\/dashboard\/admin\/users\/kyc\/[^/]+$/.test(
        url.pathname.replace(/\/$/, ""),
      ),
    { timeout: 30_000 },
  );
}

/**
 * If the current KYC review is Approved or Pending, reject it so the user can
 * (re)submit cleanly. ("Unapprove" = reject via admin UI.)
 */
export async function unapproveKycIfNeeded(page: Page) {
  await expect(page.getByRole("button", { name: /Reject KYC/i })).toBeVisible({
    timeout: 20_000,
  });

  const approveBtn = page.getByRole("button", { name: /Approve KYC/i });
  const approveDisabled = await approveBtn.isDisabled().catch(() => false);
  const statusText = await page
    .getByText(/^(Approved|Pending|Rejected)$/i)
    .first()
    .innerText()
    .catch(() => "");

  const needsReject =
    approveDisabled ||
    /^Approved$/i.test(statusText) ||
    /^Pending$/i.test(statusText);

  if (!needsReject && /^Rejected$/i.test(statusText)) {
    console.log("KYC already rejected — ready for resubmit.");
    return;
  }

  if (!needsReject) {
    // Fallback: if we can't read status clearly but Reject is available, reject anyway
    console.log(`KYC status "${statusText || "unknown"}" — rejecting to reset.`);
  }

  await page.getByRole("button", { name: /Reject KYC/i }).click();
  await expect(
    page.getByRole("heading", { name: /Reject KYC Verification/i }),
  ).toBeVisible({ timeout: 10_000 });

  await page.locator("#reason").fill("E2E automation reset — safe to re-approve");
  await page.getByRole("dialog").getByRole("button", { name: /^Reject KYC$/i }).click();

  await waitForAdminUsersKycAlert(page, "rejected");
  console.log("KYC unapproved (rejected) successfully.");
}

/**
 * Submits the KYC setup wizard end-to-end and expects success.
 */
export async function submitKycSetupForm(page: Page) {
  await page.goto("/dashboard/settings/kyc-setup", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // Clear any leftover draft that could skip steps
  await page.evaluate(() => localStorage.removeItem("kycDraft"));
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator("#firstName")).toBeVisible({ timeout: 30_000 });
  await page.locator("#firstName").fill("Muhammad");
  await page.locator("#lastName").fill("E2E");
  await page.locator("#phone").fill("+23480118529085");

  const selects = page.locator("select");
  await selects.nth(0).selectOption({ label: "12" });
  await selects.nth(1).selectOption({ label: "October" });
  await selects.nth(2).selectOption({ label: "2004" });

  await page.getByRole("button", { name: /^Next$/i }).click();
  console.log("KYC step 1 (personal) complete.");

  await page.locator("#address").waitFor({ state: "visible", timeout: 15_000 });
  await page.locator("#address").fill("14 Johnson Adetoye");
  await page.locator("#city").fill("Abuja");
  await page.locator("#state").fill("FCT");
  await page.locator("#postal").fill("900001");

  const country = page.getByRole("combobox").filter({
    hasText: /Select a country|Nigeria|Loading countries/i,
  }).first();
  await expect(country).toBeVisible({ timeout: 15_000 });
  // Wait for countries to finish loading
  await expect(country).not.toContainText(/Loading countries/i, {
    timeout: 20_000,
  });
  await country.click();
  await page.getByRole("option", { name: /^Nigeria$/i }).click();
  await expect(country).toContainText(/Nigeria/i);

  await page.getByRole("button", { name: /^Next$/i }).click();
  console.log("KYC step 2 (address) complete.");

  const docSelect = page.locator("#documentType");
  await expect(docSelect).toBeVisible({ timeout: 15_000 });
  await docSelect.selectOption({ label: "NIN" });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 10_000 });
  await fileInput.setInputFiles(minimalPdf("e2e-kyc-resubmit.pdf"));

  await page.getByRole("button", { name: /^Next$/i }).click();
  console.log("KYC step 3 (document) submitted.");

  // Success UI (must NOT be "already verified")
  const success = page.getByText(/All done you checked out!/i);
  const error = page.getByText(/already verified|failed|error/i);

  await Promise.race([
    success.waitFor({ state: "visible", timeout: 90_000 }),
    error.first().waitFor({ state: "visible", timeout: 90_000 }),
  ]);

  if (await error.first().isVisible().catch(() => false)) {
    const errText = await error.first().innerText();
    throw new Error(`KYC submit failed unexpectedly: ${errText}`);
  }

  await expect(success).toBeVisible();
  console.log("KYC resubmitted successfully.");

  const proceed = page.getByRole("button", { name: /Proceed/i });
  if (await proceed.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await proceed.click();
  }
}

/**
 * Rejects the test user's current KYC (Approved or Pending) from admin review.
 * Asserts redirect / rejection signal.
 */
export async function rejectOwnKyc(
  page: Page,
  email = TEST_EMAIL,
  reason = "E2E KYC rejection — document unclear, please resubmit",
) {
  await openKycAdminReviewForEmail(page, email);

  await expect(page.getByRole("button", { name: /Reject KYC/i })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: /Reject KYC/i }).click();
  await expect(
    page.getByRole("heading", { name: /Reject KYC Verification/i }),
  ).toBeVisible({ timeout: 10_000 });

  await page.locator("#reason").fill(reason);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Reject KYC$/i })
    .click();

  await waitForAdminUsersKycAlert(page, "rejected");
  console.log("Own KYC rejected successfully.");
}

/**
 * Approves the test user's KYC if it is Pending or Rejected.
 * No-ops when already Approved. Self-heals leftover E2E/MCP rejections
 * so cause creation is not blocked.
 */
export async function ensureOwnKycApproved(
  page: Page,
  email = TEST_EMAIL,
) {
  await openKycAdminReviewForEmail(page, email);

  const approveBtn = page.getByRole("button", { name: /Approve KYC/i });
  await expect(approveBtn).toBeVisible({ timeout: 20_000 });

  if (await approveBtn.isDisabled()) {
    console.log("KYC already approved — ready for cause flows.");
    return;
  }

  const statusHint = await page
    .getByText(/^(Approved|Pending|Rejected)$/i)
    .first()
    .innerText()
    .catch(() => "unknown");
  console.log(`KYC status "${statusHint}" — approving so causes can be created.`);

  await expect(approveBtn).toBeEnabled({ timeout: 15_000 });
  await approveBtn.click();
  await waitForAdminUsersKycAlert(page, "approved");
  console.log("KYC approved successfully.");
}

/**
 * Approves the test user's pending (or rejected) KYC from admin review.
 */
export async function approveOwnPendingKyc(
  page: Page,
  email = TEST_EMAIL,
) {
  await ensureOwnKycApproved(page, email);
}
