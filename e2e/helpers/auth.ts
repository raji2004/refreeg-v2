import { expect, type Page } from "@playwright/test";

export const TEST_EMAIL =
  process.env.REFREEG_E2E_EMAIL || "kingraj1344@gmail.com";
export const TEST_PASSWORD = process.env.REFREEG_E2E_PASSWORD || "12345678";

/**
 * Signs in against apps.refreeg.com (or PLAYWRIGHT_BASE_URL).
 * Handles already-authenticated sessions by signing out first when needed.
 */
export async function signIn(
  page: Page,
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
) {
  await page.goto("/auth/signin", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // Already authenticated → land on dashboard
  if (page.url().includes("/dashboard")) {
    console.log("Already authenticated; using existing session.");
    return;
  }

  const emailInput = page.locator("#email");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^Sign In$/i }).click();

  // Wait for either successful navigation OR an error toast to appear
  const errorToast = page.getByText(/Error signing in|Invalid credentials/i).first();
  await Promise.race([
    page.waitForURL(/\/dashboard/, { timeout: 240_000 }),
    errorToast.waitFor({ state: "visible", timeout: 15_000 })
      .then(async () => {
        const text = await errorToast.innerText();
        throw new Error(`Login failed: Error toast appeared with text "${text}"`);
      })
      .catch((e) => {
        // If it's a TimeoutError from waiting for the toast, ignore it
        // If it's the custom Error we just threw, rethrow it
        if (e.message.includes("Login failed")) throw e;
        // Otherwise return a promise that never resolves, so waitForURL wins the race
        return new Promise(() => {});
      }),
  ]);

  await expect(page.getByText(/Welcome back/i).first()).toBeVisible({
    timeout: 60_000,
  });
  console.log("Signed in successfully.");
}

export async function signOutIfNeeded(page: Page) {
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (page.url().includes("/auth/signin")) {
    return;
  }

  const signOut = page.getByRole("button", { name: /Sign Out/i }).first();
  if (await signOut.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signOut.click();
    await page.waitForURL(/\/auth\/signin|\/$/, { timeout: 30_000 }).catch(() => undefined);
  }
}
