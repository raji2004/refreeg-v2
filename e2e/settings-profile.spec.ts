import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signIn, TEST_EMAIL } from "./helpers/auth";

const prisma = new PrismaClient();

const SUITE_TAG = `E2E Profile ${Date.now().toString().slice(-6)}`;
const PHONE = "08012345678";

async function loadTestUser() {
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: {
      id: true,
      fullName: true,
      displayName: true,
      phone: true,
      location: true,
      username: true,
      donationPreference: true,
      interests: true,
      bio: true,
    },
  });
  if (!user) throw new Error(`Test user not found: ${TEST_EMAIL}`);
  return user;
}

async function openSettingsProfile(page: Page) {
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // App shell sidebar (desktop) or sheet — Settings should land on profile
  const settingsNav = page
    .locator('a[href="/dashboard/settings/profile"]')
    .filter({ hasText: /^Settings$/i })
    .first();

  if (await settingsNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await settingsNav.click();
  } else {
    // Mobile: open menu then Settings
    const menu = page
      .getByRole("button", { name: /open.*(nav|menu)|menu|toggle/i })
      .first();
    if (await menu.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await menu.click();
      await page.waitForTimeout(400);
    }
    const mobileSettings = page
      .locator('a[href="/dashboard/settings/profile"]')
      .filter({ hasText: /Settings/i })
      .first();
    if (await mobileSettings.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await mobileSettings.click();
    } else {
      // Fallback: go direct — nav chrome varies by viewport
      await page.goto("/dashboard/settings/profile", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }
  }

  await expect(page).toHaveURL(/\/dashboard\/settings\/profile/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /^Settings$/i }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Profile rows are labeled with a <label>; Edit/Add/Change/Save/Cancel live in that row. */
async function clickRowAction(page: Page, label: string, action: RegExp) {
  const row = page.locator(`[data-profile-row="${label}"]`);
  await row.getByRole("button", { name: action }).click();
}

async function editRow(page: Page, label: string) {
  await clickRowAction(page, label, /^(Edit|Add)$/);
  return page.locator(`[data-profile-row="${label}"]`);
}

test.describe("Settings profile redesign", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  let original: Awaited<ReturnType<typeof loadTestUser>>;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    original = await loadTestUser();
    page = await browser.newPage();
    page.on("pageerror", (error) =>
      console.error("[browser page error]", error.message),
    );
    await signIn(page);
  });

  test.afterAll(async () => {
    try {
      await page?.close();
    } catch {
      // ignore
    }
    try {
      if (original?.id) {
        await prisma.user.update({
          where: { id: original.id },
          data: {
            fullName: original.fullName,
            displayName: original.displayName,
            phone: original.phone,
            location: original.location,
            donationPreference: original.donationPreference ?? "named",
            interests: original.interests ?? [],
            bio: original.bio,
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("1) Settings nav goes to /dashboard/settings/profile", async () => {
    await openSettingsProfile(page);
    await expect(
      page.getByText(/Editing one row at a time/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Change$/i })).toBeVisible();
  });

  test("2) Profile page shows core sections and settings sub-nav", async () => {
    await page.goto("/dashboard/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Full name", { exact: true })).toBeVisible();
    await expect(page.getByText("Display name", { exact: true })).toBeVisible();
    await expect(page.getByText("Email", { exact: true })).toBeVisible();
    await expect(page.getByText("Phone", { exact: true })).toBeVisible();
    await expect(page.getByText("State", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Skills for bounties", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/How you appear on campaigns you fund/i),
    ).toBeVisible();
    await expect(page.getByText("Anonymous", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Change photo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Change$/i })).toBeVisible();

    // Desktop sub-nav (hidden on narrow viewports)
    const profileSubNav = page
      .getByRole("navigation", { name: /Settings/i })
      .getByRole("link", { name: /^Profile$/i });
    if (await profileSubNav.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(profileSubNav).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: /Settings/i })
          .getByRole("link", { name: /Notifications/i }),
      ).toBeVisible();
    }
  });

  test("3) Edit fields, save, and persist after reload + DB check", async () => {
    const fullName = `${SUITE_TAG} User`;
    const displayName = `${SUITE_TAG} D.`;
    const location = `Lagos-${SUITE_TAG.slice(-4)}`;

    await page.goto("/dashboard/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Full name
    let row = await editRow(page, "Full name");
    await row.locator("input#full_name").fill(fullName);
    await clickRowAction(page, "Full name", /^Save$/);
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Display name
    row = await editRow(page, "Display name");
    await row.locator("input#display_name").fill(displayName);
    await clickRowAction(page, "Display name", /^Save$/);
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Phone
    row = await editRow(page, "Phone");
    await row.locator("input#phone").fill(PHONE);
    await clickRowAction(page, "Phone", /^Save$/);
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // State
    row = await editRow(page, "State");
    await row.locator("input#location").fill(location);
    await clickRowAction(page, "State", /^Save$/);
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Skills — toggle Education on
    row = await editRow(page, "Skills for bounties");
    const educationChip = row.getByRole("button", { name: /^Education$/i });
    await expect(educationChip).toBeVisible();
    await educationChip.click();
    await page.waitForTimeout(200);
    const selectedClass = await educationChip.getAttribute("class");
    if (!selectedClass?.includes("bg-ink")) {
      await educationChip.click();
      await page.waitForTimeout(200);
    }
    await clickRowAction(page, "Skills for bounties", /^Save$/);
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Appearance → Anonymous (applies on flip)
    await page
      .getByRole("button", { name: /Anonymous/i })
      .filter({ hasText: /NGO still gets a receipt/i })
      .click();
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Reload UI persistence
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(fullName).first()).toBeVisible();
    await expect(page.getByText(displayName).first()).toBeVisible();
    await expect(page.getByText(PHONE).first()).toBeVisible();
    await expect(page.getByText(location).first()).toBeVisible();
    await expect(page.getByText("Education").first()).toBeVisible();

    // Anonymous option should remain selected (azure border / check)
    const anonymousOption = page
      .getByRole("button", { name: /Anonymous/i })
      .filter({ hasText: /NGO still gets a receipt/i });
    await expect(anonymousOption).toBeVisible();
    await expect(anonymousOption.locator("svg").first()).toBeVisible();

    // DB persistence
    const saved = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        fullName: true,
        displayName: true,
        phone: true,
        location: true,
        donationPreference: true,
        interests: true,
      },
    });
    expect(saved?.fullName).toBe(fullName);
    expect(saved?.displayName).toBe(displayName);
    expect(saved?.phone).toBe(PHONE);
    expect(saved?.location).toBe(location);
    expect(saved?.donationPreference).toBe("anonymous");
    expect(saved?.interests ?? []).toContain("education");
  });

  test("4) Rejects invalid phone and does not toast success", async () => {
    await page.goto("/dashboard/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    const row = await editRow(page, "Phone");
    await row.locator("input#phone").fill("12345");
    await clickRowAction(page, "Phone", /^Save$/);

    await expect(
      page.getByText(/valid Nigerian phone number/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Profile updated/i)).toHaveCount(0);
  });

  test("5) Direct /dashboard/settings still loads; sub-nav Profile works", async () => {
    await page.goto("/dashboard/settings", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Desktop: settings sub-nav. Mobile: SettingsItem cards (desktop nav is lg:hidden).
    const profileLink = page
      .locator('a[href="/dashboard/settings/profile"]')
      .filter({ hasText: /Profile/i })
      .locator("visible=true")
      .first();
    await expect(profileLink).toBeVisible({ timeout: 15_000 });
    await profileLink.click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("6) Switch appearance back to named and save", async () => {
    await page.goto("/dashboard/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    // First option is the named preview button — applies on flip
    const namedOption = page
      .locator("button")
      .filter({ hasText: /Display name and state/i })
      .first();
    await namedOption.click();
    await expect(page.getByText(/Profile updated/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const saved = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: { donationPreference: true },
    });
    expect(saved?.donationPreference).toBe("named");
  });

  test("7) Email Change opens modal matching design", async () => {
    await page.goto("/dashboard/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^Change$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByRole("heading", { name: /Change your email/i }),
    ).toBeVisible();
    await expect(dialog.getByText(/New email/i)).toBeVisible();
    await expect(dialog.getByText(/Your password/i)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Send the confirmation/i }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/We will email the new address to confirm it/i),
    ).toBeVisible();
  });
});
