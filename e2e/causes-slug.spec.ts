import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadApprovedCause() {
  const prisma = new PrismaClient();
  try {
    const cause = await prisma.cause.findFirst({
      where: {
        status: "approved",
        slug: { not: null },
        compliance_paused: false,
      },
      select: { id: true, slug: true, title: true },
      orderBy: { createdAt: "desc" },
    });
    return cause;
  } finally {
    await prisma.$disconnect();
  }
}

test.describe("Campaign slug URLs", () => {
  test.describe.configure({ mode: "serial" });

  test("listing cards link to slug paths, not UUIDs", async ({ page }) => {
    await page.goto("/causes", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const causeLinks = page.locator('a[href^="/causes/"]');
    await expect(causeLinks.first()).toBeVisible({ timeout: 30_000 });

    const hrefs = await causeLinks.evaluateAll((anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).getAttribute("href") || "")
        .filter((href) => /^\/causes\/[^/]+\/?$/.test(href)),
    );

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs.slice(0, 12)) {
      const segment = href.replace(/^\/causes\//, "").replace(/\/$/, "");
      expect(segment).toBeTruthy();
      expect(segment).not.toMatch(UUID_RE);
    }
  });

  test("slug URL loads the campaign and UUID URL redirects to it", async ({
    page,
  }) => {
    const cause = await loadApprovedCause();
    test.skip(!cause?.slug, "No approved cause with a slug in the database");

    await page.goto(`/causes/${cause!.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page).toHaveURL(new RegExp(`/causes/${cause!.slug}/?$`));
    await expect(
      page.getByRole("heading", { name: cause!.title }).first(),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(`/causes/${cause!.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page).toHaveURL(new RegExp(`/causes/${cause!.slug}/?$`), {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: cause!.title }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("donate and pledge UUID URLs redirect to slug paths", async ({
    page,
  }) => {
    const cause = await loadApprovedCause();
    test.skip(!cause?.slug, "No approved cause with a slug in the database");

    await page.goto(`/causes/${cause!.id}/donate`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/causes/${cause!.slug}/donate/?$`),
      { timeout: 30_000 },
    );

    await page.goto(`/causes/${cause!.id}/pledge`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/causes/${cause!.slug}/pledge/?$`),
      { timeout: 30_000 },
    );
  });
});
