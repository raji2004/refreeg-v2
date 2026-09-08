import { expect, type Page } from "@playwright/test";
import { minimalJpeg, shortWebm } from "./files";
import { formatFundingGoalInput } from "../../lib/funding-goal";

export async function pickCalendarDay(
  page: Page,
  triggerId: string,
  day: number,
) {
  await page.locator(`#${triggerId}`).click();
  const cell = page
    .locator(
      ".rdp-day_button:not([disabled]), [role='gridcell'] button:not([disabled]), button:not([disabled])",
    )
    .filter({ hasText: new RegExp(`^${day}$`) })
    .last();
  await expect(cell).toBeVisible({ timeout: 10_000 });
  await cell.click();
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(300);
}

async function selectCategory(page: Page, category: string) {
  await page
    .getByRole("combobox")
    .filter({ hasText: /What's this about\?/i })
    .click();
  await page.getByRole("option", { name: category }).click();
  await expect(
    page.getByRole("combobox").filter({ hasText: category }).first(),
  ).toBeVisible({ timeout: 5_000 });
}

async function advanceFromStep1(page: Page) {
  const continueBtn = page.getByRole("button", { name: /^Continue$/i }).last();
  await continueBtn.scrollIntoViewIfNeeded();
  await expect(continueBtn).toBeInViewport({ timeout: 10_000 });
  await continueBtn.click();

  const storyHeading = page.locator("#section-heading-0");
  try {
    await expect(storyHeading).toBeVisible({ timeout: 10_000 });
  } catch {
    const errors = await page
      .locator("p.text-red-500, .text-red-500")
      .allTextContents();
    console.log("Step 1 validation errors:", errors);
    await page.waitForTimeout(500);
    await continueBtn.scrollIntoViewIfNeeded();
    await continueBtn.click();
    await expect(storyHeading).toBeVisible({ timeout: 15_000 });
  }
}

/** Assert primary wizard CTAs are reachable on the current viewport (desktop + mobile). */
export async function expectWizardActionReachable(
  page: Page,
  name: RegExp,
) {
  const btn = page.getByRole("button", { name }).last();
  await btn.scrollIntoViewIfNeeded();
  await expect(btn).toBeVisible({ timeout: 15_000 });
  await expect(btn).toBeInViewport({ timeout: 10_000 });
  await expect(btn).toBeEnabled({ timeout: 10_000 });
  return btn;
}

/**
 * Walk create-cause steps 1–3 and land on Visual Impact (media).
 */
export async function gotoCreateCauseVisualImpact(
  page: Page,
  opts: {
    title: string;
    summary?: string;
    location?: string;
    category?: string;
    goal?: string;
  },
) {
  const {
    title,
    summary = "E2E automation cause safe to approve or reject",
    location = "Lagos, Nigeria",
    category = "Community",
    goal = "250000",
  } = opts;

  await page.evaluate(() => localStorage.removeItem("causeDraft"));
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator("#title")).toBeVisible({ timeout: 30_000 });

  await page.locator("#title").click();
  await page.locator("#title").fill("");
  await page.locator("#title").pressSequentially(title, { delay: 15 });
  await expect(page.locator("#title")).toHaveValue(title);

  await page.locator("#summary").fill(summary);
  const useCurrentLocation = page.getByRole("button", {
    name: /Use my location/i,
  });
  if (
    await useCurrentLocation.isVisible({ timeout: 2_000 }).catch(() => false)
  ) {
    await page.context().grantPermissions(["geolocation"], {
      origin: new URL(page.url()).origin,
    });
    await page.context().setGeolocation({
      latitude: 6.5244,
      longitude: 3.3792,
      accuracy: 50,
    });
    await useCurrentLocation.click();
    await expect(page.locator("#location")).not.toHaveValue("", {
      timeout: 20_000,
    });
  } else {
    // Backward-compatible path for production runs during a rolling deploy.
    await page.locator("#location").fill(location);
  }
  await selectCategory(page, category);
  await page.locator("#goal").fill(goal);
  await expect(page.locator("#goal")).toHaveValue(
    formatFundingGoalInput(goal),
  );

  await page.keyboard.press("Escape").catch(() => undefined);
  await advanceFromStep1(page);
  console.log("Step 1 (Basic Info) complete.");

  await page.locator("#section-heading-0").fill("The Challenge");
  await page
    .locator("#section-description-0")
    .fill(
      "This is an automated E2E story section describing why this cause matters to the community and how funds will help.",
    );
  await (await expectWizardActionReachable(page, /^Continue$/i)).click();
  await expect(page.locator("#start-date")).toBeVisible({ timeout: 20_000 });
  console.log("Step 2 (Story) complete.");

  await expect(page.locator("#start-date")).toBeVisible({ timeout: 20_000 });
  const startLabel = (await page.locator("#start-date").innerText()).trim();
  const endLabel = (await page.locator("#end-date").innerText()).trim();

  if (/Pick a date/i.test(startLabel)) {
    const today = new Date();
    await pickCalendarDay(page, "start-date", today.getDate());
  }
  if (/Pick a date/i.test(endLabel)) {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    await pickCalendarDay(page, "end-date", Math.min(end.getDate(), 28));
  }

  await expect(page.locator("#start-date")).not.toContainText(/Pick a date/i);
  await expect(page.locator("#end-date")).not.toContainText(/Pick a date/i);

  await (await expectWizardActionReachable(page, /^Continue$/i)).click();
  await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 20_000 });
  console.log("Step 3 (Timeline) complete — on Visual Impact.");
}

export async function uploadCoverImage(page: Page) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 15_000 });
  await fileInput.setInputFiles(minimalJpeg("e2e-cover.jpg"));

  // Cover upload opens Crop Image dialog. Prefer "Use Original" — Apply Crop
  // often fails on the tiny 1×1 E2E JPEG, and on mobile the footer can be flaky.
  const useOriginal = page.getByRole("button", { name: /^Use Original$/i });
  const applyCrop = page.getByRole("button", { name: /^Apply Crop$/i });

  try {
    await useOriginal.waitFor({ state: "visible", timeout: 12_000 });
    await useOriginal.scrollIntoViewIfNeeded();
    await useOriginal.click();
  } catch {
    if (await applyCrop.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await applyCrop.scrollIntoViewIfNeeded();
      await applyCrop.click();
    }
  }

  await expect(page.getByRole("heading", { name: /Crop Image/i }))
    .toBeHidden({ timeout: 20_000 })
    .catch(() => undefined);

  await expect(
    page.locator('img[alt="Cover Preview"], img[src^="blob:"]').first(),
  ).toBeVisible({ timeout: 20_000 });
}

/**
 * Uploads a short WebM into the multimedia gallery (2nd file input on Visual Impact).
 * Scrolls the gallery into view first (mobile nav / sticky footers can cover it).
 */
export async function uploadGalleryVideo(page: Page) {
  await page.getByText(/Multimedia Gallery/i).first().scrollIntoViewIfNeeded();

  const galleryInput = page.locator('input[type="file"]').nth(1);
  await galleryInput.waitFor({ state: "attached", timeout: 15_000 });
  await galleryInput.setInputFiles(shortWebm("e2e-clip.webm"));

  const videoPreview = page.locator("video").first();
  await expect(videoPreview).toBeVisible({ timeout: 20_000 });
  await videoPreview.scrollIntoViewIfNeeded();
  await expect(page.getByText(/Video/i).first()).toBeVisible({
    timeout: 10_000,
  });
  console.log("Gallery video preview visible.");
  return videoPreview;
}

/**
 * Mock presigned S3 upload so Launch works without live bucket CORS.
 * Images still go through the server action path.
 */
export async function mockVideoPresignUpload(page: Page) {
  await page.route("**/api/s3/presign", async (route) => {
    const body = route.request().postDataJSON() as {
      filename?: string;
      contentType?: string;
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uploadUrl: "https://e2e-mock-s3.local/put",
        key: `uploads/causes/e2e/videos/${body?.filename || "clip.webm"}`,
        contentType: body?.contentType || "video/webm",
        expiresIn: 900,
      }),
    });
  });

  await page.route("https://e2e-mock-s3.local/**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

export async function fillCreateCauseWizard(
  page: Page,
  opts: {
    title: string;
    summary?: string;
    location?: string;
    category?: string;
    goal?: string;
    includeGalleryVideo?: boolean;
    mockVideoUpload?: boolean;
  },
) {
  const { includeGalleryVideo = false, mockVideoUpload = false, ...rest } =
    opts;

  if (mockVideoUpload || includeGalleryVideo) {
    await mockVideoPresignUpload(page);
  }

  await gotoCreateCauseVisualImpact(page, rest);
  await uploadCoverImage(page);

  if (includeGalleryVideo) {
    await uploadGalleryVideo(page);
  }

  await (await expectWizardActionReachable(page, /^Continue$/i)).click();
  await expectWizardActionReachable(page, /Launch Cause/i);
  console.log("Step 4 (Media) complete.");

  await expect(page.getByText(rest.title).first()).toBeVisible({
    timeout: 15_000,
  });
  await (await expectWizardActionReachable(page, /Launch Cause/i)).click();
  console.log("Submitted Launch Cause.");
}

export async function openCauseActionsMenu(page: Page, causeTitle: string) {
  const row = page.locator("tr").filter({ hasText: causeTitle }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole("button", { name: /Actions/i }).click();
}

/**
 * Admin-rejects a pending cause from /dashboard/admin/causes (Pending tab).
 */
export async function rejectCauseFromAdmin(
  page: Page,
  causeTitle: string,
  reason = "E2E automation rejection — incomplete or test campaign",
) {
  await page.goto("/dashboard/admin/causes", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.getByRole("tab", { name: /Pending/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: /Pending/i }).click();

  await openCauseActionsMenu(page, causeTitle);
  await page.getByRole("menuitem", { name: /^Reject$/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: /Reject Cause/i }),
  ).toBeVisible({ timeout: 10_000 });

  await dialog.getByPlaceholder(/Rejection reason/i).fill(reason);
  await dialog.getByRole("button", { name: /^Reject Cause$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  await page.getByRole("tab", { name: /Rejected/i }).click();
  await expect(
    page.locator("tr").filter({ hasText: causeTitle }).first(),
  ).toBeVisible({ timeout: 30_000 });

  console.log(`Cause "${causeTitle}" rejected successfully.`);
}
