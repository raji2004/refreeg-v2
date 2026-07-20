import { expect, test, type Page } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import {
  fillCreateCauseWizard,
  openCauseActionsMenu,
  pickCalendarDay,
  rejectCauseFromAdmin,
} from "./helpers/cause-form";
import { minimalJpeg } from "./helpers/files";
import {
  approveOwnPendingKyc,
  ensureOwnKycApproved,
  openKycAdminReviewForEmail,
  rejectOwnKyc,
  submitKycSetupForm,
  unapproveKycIfNeeded,
} from "./helpers/kyc";

/**
 * Deep production E2E for RefreeG causes + KYC.
 * Target: PLAYWRIGHT_BASE_URL=https://apps.refreeg.com
 *
 * Flow (serial):
 * 0. Ensure KYC is approved (self-heal after leftover rejections)
 * 1–5. Create → pending → approve → donate → edit (happy path)
 * 6. Create a second cause and admin-reject it
 * 7. Unapprove own KYC (reject if approved)
 * 8. Resubmit KYC
 * 9. Admin-reject the pending KYC and verify rejected UI
 * 10. Resubmit KYC again
 * 11. Approve own pending KYC (leave account verified)
 */
async function resolveCauseIdNearTitle(page: Page, title: string) {
  const card = page
    .locator("div, article, li, tr, section")
    .filter({ hasText: title })
    .filter({ has: page.locator(`text="${title}"`) })
    .first();

  const scoped = page
    .locator("div")
    .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
    .filter({
      has: page.locator(
        'a[href*="/causes/"], a[href*="/dashboard/causes/"]',
      ),
    })
    .last();

  const container = (await scoped.count()) > 0 ? scoped : card;
  await expect(container).toBeVisible({ timeout: 30_000 });

  const hrefs = await container
    .locator('a[href*="/causes/"], a[href*="/dashboard/causes/"]')
    .evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""),
    );

  for (const href of hrefs) {
    const match = href.match(
      /\/(?:dashboard\/)?causes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (match?.[1]) return match[1];
  }

  const html = await container.innerHTML();
  return (
    html.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    )?.[1] || ""
  );
}

test.describe("RefreeG Production — Causes & KYC", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  const causeTitle = `E2E Cause ${Date.now()}`;
  const rejectCauseTitle = `E2E Cause Reject ${Date.now()}`;
  const editedTitle = `${causeTitle} (Edited)`;
  let causeId = "";

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("0) ensure KYC is approved before cause flows", async ({ page }) => {
    await ensureOwnKycApproved(page, TEST_EMAIL);

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page
        .getByText(
          /Identity Verification|KYC Verification Status|Your KYC has been approved|Your KYC is approved|All features unlocked/i,
        )
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/Your KYC has been approved|Your KYC is approved|All features unlocked|Approved/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("1) create a cause through the full wizard", async ({ page }) => {
    await page.goto("/dashboard/causes/create", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // If still gated by KYC, fail with a clear message
    if (/\/dashboard\/settings\/kyc/i.test(page.url())) {
      throw new Error(
        "Cause create redirected to KYC settings — KYC is not approved.",
      );
    }

    await fillCreateCauseWizard(page, {
      title: causeTitle,
      category: "Community",
      goal: "150000",
    });

    // Exact list route — not /dashboard/causes/create
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, "") === "/dashboard/causes",
      { timeout: 90_000 },
    );
    await expect(page.getByText(causeTitle).first()).toBeVisible({
      timeout: 30_000,
    });

    // Prefer toast, but list presence is enough if toast already dismissed
    const toast = page.getByText(
      /Cause created successfully|submitted for approval/i,
    );
    if (await toast.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log("Create-success toast visible.");
    }

    // Prefer the "View cause" / analytics link inside the matching card
    const viewLink = page
      .locator("div")
      .filter({ hasText: causeTitle })
      .locator(`a[href*="/causes/"]`)
      .filter({ hasText: /View cause|View|Analytics/i })
      .first();

    if (await viewLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const href = (await viewLink.getAttribute("href")) || "";
      causeId =
        href.match(
          /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
        )?.[1] || "";
    }

    if (!causeId) {
      causeId = await resolveCauseIdNearTitle(page, causeTitle);
    }

    expect(causeId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    console.log(`Cause "${causeTitle}" created successfully. id=${causeId}`);
  });

  test("2) show newly created cause as pending on My Causes", async ({
    page,
  }) => {
    await page.goto("/dashboard/causes", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByText(causeTitle).first()).toBeVisible({
      timeout: 30_000,
    });

    const pendingBadge = page
      .locator("div, article, tr, li")
      .filter({ hasText: causeTitle })
      .getByText(/pending|Awaiting Approval/i)
      .first();
    await expect(pendingBadge).toBeVisible({ timeout: 15_000 });

    if (!causeId) {
      causeId = await resolveCauseIdNearTitle(page, causeTitle);
    }

    expect(causeId).toBeTruthy();
    console.log(`Pending cause visible. id=${causeId}`);
  });

  test("3) admin approves the pending cause", async ({ page }) => {
    await page.goto("/dashboard/admin/causes", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByRole("tab", { name: /Pending/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: /Pending/i }).click();

    const row = page.locator("tr").filter({ hasText: causeTitle }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });

    if (!causeId) {
      // Try extracting from row data attributes / links
      const html = await row.innerHTML();
      const match = html.match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );
      if (match) causeId = match[1];
    }

    await openCauseActionsMenu(page, causeTitle);
    await page.getByRole("menuitem", { name: /^Approve$/i }).click();

    await expect(
      page.getByText(/Cause approved|approved successfully/i).first(),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /Approved/i }).click();
    await expect(
      page.locator("tr").filter({ hasText: causeTitle }).first(),
    ).toBeVisible({ timeout: 30_000 });

    console.log(`Cause "${causeTitle}" approved.`);
  });

  test("4) donate to the approved cause (stop at Paystack)", async ({
    page,
  }) => {
    test.skip(!causeId, "causeId not captured from create/approve flow");

    // Re-resolve id from My Causes to avoid stale sibling UUIDs
    await page.goto("/dashboard/causes", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const resolved = await resolveCauseIdNearTitle(page, causeTitle);
    if (resolved) causeId = resolved;
    console.log(`Donating to cause id=${causeId}`);

    await page.goto(`/causes/${causeId}/donate`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Quick-donate page: custom amount or presets
    const customAmount = page.getByPlaceholder(
      /Or enter custom amount|Enter amount/i,
    );
    const amountField = page.locator("#amount");

    if (await customAmount.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await customAmount.click();
      await customAmount.fill("");
      await customAmount.pressSequentially("1000", { delay: 20 });
      await expect(customAmount).toHaveValue("1000");
    } else if (
      await amountField.isVisible({ timeout: 5_000 }).catch(() => false)
    ) {
      await amountField.fill("1000");
    } else {
      const preset = page.getByRole("button", { name: /^1k$/i }).first();
      await preset.click();
    }

    await expect(
      page.getByRole("button", { name: /Donate ₦1,?000|Donate ₦/i }).first(),
    ).toBeEnabled({ timeout: 20_000 });

    const name = page.locator("#name");
    if (await name.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await name.fill("E2E Donor");
    }

    // Paystack rejects TLDs like .test — use a real-looking address
    const email = page.locator("#email");
    if (await email.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await email.fill("e2e.donor@gmail.com");
    }

    const donateBtn = page
      .getByRole("button", { name: /Donate ₦|Donate Now|Donate/i })
      .filter({ hasNotText: /anonymously/i })
      .first();

    await expect(donateBtn).toBeEnabled({ timeout: 20_000 });

    await donateBtn.click();
    console.log("Clicked Donate — waiting for Paystack checkout to load...");

    // Pass only if Paystack checkout opens (redirect page or inline modal/iframe).
    // Fail if neither appears within the timeout.
    const paystackUrl = /paystack\.com|checkout\.paystack/i;
    const paystackFrame = page.locator(
      'iframe[src*="paystack"], iframe[src*="checkout.paystack"]',
    );

    let how: "url" | "modal";
    try {
      how = await Promise.any([
        page
          .waitForURL(paystackUrl, { timeout: 60_000 })
          .then(() => "url" as const),
        paystackFrame
          .first()
          .waitFor({ state: "visible", timeout: 60_000 })
          .then(() => "modal" as const),
      ]);
    } catch {
      throw new Error(
        "Paystack checkout did not load (no redirect and no Paystack modal/iframe).",
      );
    }

    console.log(`Paystack loaded via ${how}. url=${page.url()}`);
  });

  test("5) edit the cause and submit for review", async ({ page }) => {
    test.skip(!causeId, "causeId not captured from create/approve flow");

    await page.goto(`/dashboard/causes/${causeId}/edit`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Gate: pending edit already exists
    const pendingEdit = page.getByText(/Edit Already Pending/i);
    if (await pendingEdit.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log("Edit already pending — verifying gate UI.");
      await expect(page.getByRole("link", { name: /Back to Causes/i })).toBeVisible();
      return;
    }

    await expect(page.locator("#title")).toBeVisible({ timeout: 30_000 });
    await page.locator("#title").fill(editedTitle);
    await page.locator("#summary").fill("Updated summary from Playwright E2E");

    // Walk through remaining steps if wizard requires Continue
    for (let step = 0; step < 4; step++) {
      const continueBtn = page.getByRole("button", { name: /^Continue$/i });
      if (await continueBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Ensure story fields if we're on story step
        const heading = page.locator("#section-heading-0");
        if (await heading.isVisible({ timeout: 1_000 }).catch(() => false)) {
          if (!(await heading.inputValue())) {
            await heading.fill("Updated Challenge");
            await page
              .locator("#section-description-0")
              .fill("Updated story content for E2E edit flow.");
          }
        }

        // Timeline
        if (await page.locator("#start-date").isVisible({ timeout: 1_000 }).catch(() => false)) {
          const startLabel = await page.locator("#start-date").innerText();
          if (/Pick a date/i.test(startLabel)) {
            const d = new Date().getDate();
            await pickCalendarDay(page, "start-date", d);
            await pickCalendarDay(page, "end-date", Math.min(d + 20, 28));
          }
        }

        // Media — keep existing or upload if required
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
          const coverError = page.getByText(/Cover image is required/i);
          // Only set if no preview
          const hasPreview = await page
            .locator('img[src^="blob:"], img[src*="http"]')
            .first()
            .isVisible()
            .catch(() => false);
          if (!hasPreview) {
            await fileInput.setInputFiles(minimalJpeg("e2e-edit-cover.jpg"));
          }
          void coverError;
        }

        await continueBtn.click();
      } else {
        break;
      }
    }

    const updateBtn = page.getByRole("button", { name: /Update Cause/i });
    await expect(updateBtn).toBeVisible({ timeout: 20_000 });
    await updateBtn.click();

    await page.waitForURL(
      (url) => {
        const path = url.pathname.replace(/\/$/, "");
        return path === "/dashboard/causes";
      },
      { timeout: 90_000 },
    );

    await expect(
      page.getByText(/submitted for review|Success|updated/i).first(),
    )
      .toBeVisible({ timeout: 20_000 })
      .catch(async () => {
        await expect(
          page.getByText(editedTitle).or(page.getByText(causeTitle)).first(),
        ).toBeVisible({ timeout: 20_000 });
      });

    console.log("Cause edit submitted for review.");
  });

  test("6) create a cause and admin-reject it", async ({ page }) => {
    await page.goto("/dashboard/causes/create", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await fillCreateCauseWizard(page, {
      title: rejectCauseTitle,
      category: "Education",
      goal: "50000",
      summary: "E2E cause intended for rejection testing",
    });

    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, "") === "/dashboard/causes",
      { timeout: 90_000 },
    );
    await expect(page.getByText(rejectCauseTitle).first()).toBeVisible({
      timeout: 30_000,
    });

    await rejectCauseFromAdmin(page, rejectCauseTitle);

    await page.goto("/dashboard/causes?status=rejected", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.getByText(rejectCauseTitle).first()).toBeVisible({
      timeout: 20_000,
    });
    console.log(`Rejected cause visible on My Causes: ${rejectCauseTitle}`);
  });

  test("7) unapprove own KYC so resubmit is allowed", async ({ page }) => {
    await openKycAdminReviewForEmail(page, TEST_EMAIL);
    await unapproveKycIfNeeded(page);

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Wait for status card (copy differs across KYC UI revisions)
    await expect(
      page
        .getByText(/Identity Verification|KYC Verification Status/i)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page
        .getByText(/Your KYC was rejected|Resubmit Application|Resubmit KYC/i)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", {
        name: /Resubmit Application|Resubmit KYC|Resubmit/i,
      }),
    ).toBeVisible({ timeout: 15_000 });
    console.log("Own KYC is no longer approved — ready to resubmit.");
  });

  test("8) resubmit KYC through the full setup wizard", async ({ page }) => {
    await submitKycSetupForm(page);

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page
        .getByText(
          /pending review|Pending Review|under review|in the review queue|Pending/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    console.log("KYC status shows pending after resubmit.");
  });

  test("9) admin rejects the pending KYC and user sees rejection", async ({
    page,
  }) => {
    await rejectOwnKyc(
      page,
      TEST_EMAIL,
      "E2E KYC rejection test — please resubmit with a clearer document",
    );

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(
      page.getByText(/Your KYC was rejected/i).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", {
        name: /Resubmit Application|Resubmit KYC|Resubmit/i,
      }),
    ).toBeVisible({ timeout: 15_000 });
    console.log("KYC rejection visible on settings page.");
  });

  test("10) resubmit KYC after rejection", async ({ page }) => {
    await submitKycSetupForm(page);

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page
        .getByText(
          /pending review|Pending Review|under review|in the review queue|Pending/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    console.log("KYC pending again after post-rejection resubmit.");
  });

  test("11) approve own pending KYC from admin", async ({ page }) => {
    await approveOwnPendingKyc(page, TEST_EMAIL);

    await page.goto("/dashboard/settings/kyc", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page
        .getByText(
          /Your KYC has been approved|Your KYC is approved|All features unlocked|Approved/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    console.log(
      "KYC cycle complete: unapprove → resubmit → reject → resubmit → approve.",
    );
  });
});
