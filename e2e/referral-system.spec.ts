import { expect, test } from "@playwright/test";
import { signIn, TEST_EMAIL } from "./helpers/auth";
import { ensureOwnKycApproved } from "./helpers/kyc";

test.describe("RefreeG - Referral System Flow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let referrerCode: string;
  const refereeEmail = `referee-e2e-${Date.now()}@refreeg.internal`;

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await ensureOwnKycApproved(page, TEST_EMAIL);
  });

  test("should generate a referral link, sign up a new user, and verify the referral appears", async ({
    page,
    context,
  }) => {
    await page.goto("/referrals");

    await expect(page.getByText(/Share your referral link/i)).toBeVisible({
      timeout: 10_000,
    });

    const referralInput = page
      .getByRole("textbox", { name: /Referral link/i })
      .first();
    await expect(referralInput).toBeVisible();

    const referralLink = await referralInput.inputValue();
    expect(referralLink).toContain("ref_v1=");

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(referralLink);
    } catch {
      throw new Error(`Invalid referral link format: ${referralLink}`);
    }

    const urlParams = new URLSearchParams(parsedUrl.search);
    referrerCode = urlParams.get("ref_v1") || "";
    expect(referrerCode).toBeTruthy();

    const newContext = await context.browser()!.newContext();
    const newPage = await newContext.newPage();

    await newPage.goto(referralLink);

    await newPage
      .getByRole("link", { name: /Sign up|Get started/i })
      .first()
      .click();

    await newPage.getByLabel("Full Name").fill("E2E Referee");
    await newPage.getByLabel("Email").fill(refereeEmail);
    await newPage.getByLabel("Password").fill("SecurePassword123!");

    await newPage
      .getByRole("button", { name: /Create account|Sign up/i })
      .click();

    await newPage.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15_000 });

    await newContext.close();

    await page.goto("/referrals");
    await page.reload();

    await expect(page.getByText(refereeEmail.split("@")[0])).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText(/Registered|Signed up/i)).toBeVisible();
    await expect(page.getByText(/Total Points|Your Points/i)).toBeVisible();
  });

  test("should not create duplicate referrals for the same referee", async ({
    page,
    context,
  }) => {
    // FIX: Use non-null assertion since browser is guaranteed in test context
    const newContext = await context.browser()!.newContext();
    const newPage = await newContext.newPage();

    await page.goto("/referrals");
    const referralInput = page
      .getByRole("textbox", { name: /Referral link/i })
      .first();
    const referralLink = await referralInput.inputValue();

    await newPage.goto(referralLink);
    await newPage
      .getByRole("link", { name: /Sign up|Get started/i })
      .first()
      .click();

    await newPage.getByLabel("Full Name").fill("E2E Referee Duplicate");
    await newPage.getByLabel("Email").fill(refereeEmail);
    await newPage.getByLabel("Password").fill("SecurePassword123!");
    await newPage
      .getByRole("button", { name: /Create account|Sign up/i })
      .click();

    await expect(
      newPage.getByText(/email already exists|account already exists/i),
    ).toBeVisible({ timeout: 10_000 });

    await newContext.close();
  });
});
