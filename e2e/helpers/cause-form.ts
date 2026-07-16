import { expect, type Page } from "@playwright/test";
import { minimalJpeg } from "./files";

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
    await continueBtn.click();
    await expect(storyHeading).toBeVisible({ timeout: 15_000 });
  }
}

export async function fillCreateCauseWizard(
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

  // Avoid stale draft overriding typed values mid-flow
  await page.evaluate(() => localStorage.removeItem("causeDraft"));
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /Launch Your Impact/i }),
  ).toBeVisible({ timeout: 30_000 });

  // Step 1 — Basic Info
  await page.locator("#title").click();
  await page.locator("#title").fill("");
  await page.locator("#title").pressSequentially(title, { delay: 15 });
  await expect(page.locator("#title")).toHaveValue(title);

  await page.locator("#summary").fill(summary);
  await page.locator("#location").fill(location);

  await selectCategory(page, category);

  await page.locator("#goal").fill(goal);
  await expect(page.locator("#goal")).toHaveValue(goal);

  await page.keyboard.press("Escape").catch(() => undefined);
  await advanceFromStep1(page);
  console.log("Step 1 (Basic Info) complete.");

  // Step 2 — Story
  await page.locator("#section-heading-0").fill("The Challenge");
  await page
    .locator("#section-description-0")
    .fill(
      "This is an automated E2E story section describing why this cause matters to the community and how funds will help.",
    );
  await page.getByRole("button", { name: /^Continue$/i }).last().click();
  await expect(page.locator("#start-date")).toBeVisible({ timeout: 20_000 });
  console.log("Step 2 (Story) complete.");

  // Step 3 — Timeline (defaults to today → +7 days; only pick if empty)
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

  // Confirm dates are set before continuing
  await expect(page.locator("#start-date")).not.toContainText(/Pick a date/i);
  await expect(page.locator("#end-date")).not.toContainText(/Pick a date/i);

  await page.getByRole("button", { name: /^Continue$/i }).last().click();
  await expect(
    page.getByRole("heading", { name: /Visual Impact/i }),
  ).toBeVisible({ timeout: 20_000 });
  console.log("Step 3 (Timeline) complete.");

  // Step 4 — Media (react-dropzone input is often hidden)
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 15_000 });
  await fileInput.setInputFiles(minimalJpeg("e2e-cover.jpg"));

  // ImageUpload may open a crop dialog — confirm if present
  const applyCrop = page.getByRole("button", {
    name: /Apply|Save|Confirm|Done|Crop/i,
  });
  if (await applyCrop.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await applyCrop.first().click();
  }

  await expect(
    page.locator('img[alt="Cover Preview"], img[src^="blob:"]').first(),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /^Continue$/i }).last().click();
  await expect(page.getByRole("button", { name: /Launch Cause/i })).toBeVisible({
    timeout: 20_000,
  });
  console.log("Step 4 (Media) complete.");

  // Step 5 — Review & Launch
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Launch Cause/i }).click();
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
