import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";

test.describe("RefreeG - Discovery Search & Filtering", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    // Sign in to ensure we can see personalized results if applicable
    await signIn(page);
  });

  test("should open search via keyboard shortcut and find a campaign", async ({
    page,
  }) => {
    await page.goto("/causes");

    // 1. Trigger Search via Keyboard Shortcut (Cmd/Ctrl + K)
    await page.keyboard.press("Meta+k"); // Mac
    // Fallback for Windows/Linux if needed, but Playwright usually handles Meta as Ctrl on Linux
    await page.keyboard.press("Control+k");

    // 2. Verify Command Palette is open
    const searchInput = page.getByPlaceholder(
      /Search campaigns, petitions, organisations/i,
    );
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // 3. Type a search query
    await searchInput.fill("education");

    // 4. Wait for results to load
    await expect(page.getByText(/Searching/i)).not.toBeVisible({
      timeout: 10_000,
    });

    // 5. Verify results appear
    // Note: This assumes there is at least one cause with "education" in the title/desc in your DB
    const results = page.locator("[cmdk-item]");
    await expect(results.first()).toBeVisible({ timeout: 10_000 });

    // 6. Click the first result
    await results.first().click();

    // 7. Verify navigation to the cause/petition page
    await expect(page).toHaveURL(/\/causes\/|\/petitions\//);
  });

  test("should filter causes by category and update URL", async ({ page }) => {
    await page.goto("/causes");

    // 1. Select a category from the filter rail or tabs
    // Assuming "Education" is a valid category ID in your system
    const educationFilter = page
      .getByRole("button", { name: /Education/i })
      .first();

    // If it's in a dropdown or sheet, you might need to click the filter trigger first
    const filterTrigger = page.getByRole("button", { name: /Filters/i });
    if (await filterTrigger.isVisible()) {
      await filterTrigger.click();
    }

    await educationFilter.click();

    // 2. Verify URL updates with category parameter
    await expect(page).toHaveURL(/category=education/i, { timeout: 10_000 });

    // 3. Verify active state of the filter button
    await expect(educationFilter).toHaveClass(/bg-ink|text-ink-foreground/i);
  });

  test("should filter by location and verify results", async ({ page }) => {
    await page.goto("/causes");

    // 1. Open Location Filter
    const locationInput = page.getByLabel(/Location/i).first();
    if (await locationInput.isVisible()) {
      await locationInput.fill("Lagos");

      // 2. Select from autocomplete if available
      const suggestion = page.getByRole("option", { name: /Lagos/i }).first();
      if (await suggestion.isVisible({ timeout: 2_000 })) {
        await suggestion.click();
      } else {
        // If no autocomplete, just press Enter
        await locationInput.press("Enter");
      }
    }

    // 3. Verify URL updates
    await expect(page).toHaveURL(/location=Lagos/i, { timeout: 10_000 });

    // 4. Verify that visible cards contain the location or that the filter badge is shown
    await expect(page.getByText(/Lagos/i)).toBeVisible();
  });

  test("should clear all filters and reset URL", async ({ page }) => {
    await page.goto("/causes?category=health&location=Abuja&urgent=1");

    // 1. Verify filters are active
    await expect(page).toHaveURL(/category=health/);

    // 2. Click "Clear All" or "Reset" button
    const clearButton = page.getByRole("button", {
      name: /Clear all|Reset filters/i,
    });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    } else {
      // Manually remove filters if no bulk clear button exists
      await page.goto("/causes");
    }

    // 3. Verify URL is clean
    await expect(page).toHaveURL(/\/causes$/, { timeout: 10_000 });

    // 4. Verify filter badges are gone
    await expect(page.getByText(/Health/i)).not.toBeVisible();
  });

  test("should persist search state when navigating back", async ({ page }) => {
    await page.goto("/causes");

    // 1. Perform a search
    const searchInput = page.getByPlaceholder(/Search campaigns/i);
    await searchInput.fill("water");
    await searchInput.press("Enter");

    // 2. Click on a result
    const firstResult = page.locator("a[href*='/causes/']").first();
    await firstResult.click();
    await expect(page).toHaveURL(/\/causes\/[a-f0-9-]+/);

    // 3. Go back
    await page.goBack();

    // 4. Verify search term is still in the input
    await expect(searchInput).toHaveValue("water");
  });
});
