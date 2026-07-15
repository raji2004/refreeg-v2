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

  // Extract user ID from the DOM so we can mock the webhook
  const container = page.getByTestId("kyc-setup-container");
  await expect(container).toBeVisible({ timeout: 15_000 });
  
  const userId = await container.getAttribute("data-userid");
  if (!userId) {
    throw new Error("Could not find user ID on the page to mock Didit webhook.");
  }

  // Intercept the /api/kyc/didit/session API call so Didit SDK thinks a session was created successfully
  const dummySessionId = "e2e-session-" + Date.now();
  await page.route("/api/kyc/didit/session", async (route) => {
    await route.fulfill({
      status: 200,
      json: { session_id: dummySessionId, url: "http://localhost:3000/dummy-didit-url" }
    });
  });

  // Click the start verification button
  await page.getByRole("button", { name: /Start (Secure|RefreeG) Verification/i }).click();
  console.log("KYC session created.");

  // Simulate the Didit Webhook hitting our API
  // We send status: "Review" so it goes to "pending" for the Admin to test rejecting/approving
  console.log(`Sending mock Didit webhook for user ${userId}...`);
  const response = await page.request.post("/api/webhooks/didit", {
    data: {
      application_id: "e2e-test-app",
      session_id: dummySessionId,
      status: "Review",
      vendor_data: userId,
      webhook_type: "status.updated"
    }
  });
  
  if (!response.ok()) {
    throw new Error(`Mock Didit webhook failed: ${await response.text()}`);
  }

  // Reload the page to let KycSetupClient poll or see the new status
  await page.reload({ waitUntil: "domcontentloaded" });

  // Success UI (We check for Under Review since we sent 'Review' status)
  const success = page.getByText(/Under Review|Pending/i);
  const error = page.getByText(/failed|error/i);

  await Promise.race([
    success.first().waitFor({ state: "visible", timeout: 15_000 }),
    error.first().waitFor({ state: "visible", timeout: 15_000 }),
  ]);

  if (await error.first().isVisible().catch(() => false)) {
    const errText = await error.first().innerText();
    throw new Error(`KYC submit failed unexpectedly: ${errText}`);
  }

  await expect(success.first()).toBeVisible();
  console.log("KYC resubmitted successfully.");
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
