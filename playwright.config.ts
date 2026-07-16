import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for RefreeG.
 *
 * Local:  pnpm run test:e2e
 * Production: PLAYWRIGHT_BASE_URL=https://apps.refreeg.com pnpm run test:e2e:prod
 *
 * After the run, the HTML report opens in your browser (pass/fail breakdown).
 * Re-open later with: pnpm run test:e2e:report
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const isRemoteTarget =
  /^https?:\/\//.test(baseURL) && !/localhost|127\.0\.0\.1/.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !isRemoteTarget,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || isRemoteTarget ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "always", outputFolder: "playwright-report" }],
  ],
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: isRemoteTarget ? 180_000 : 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isRemoteTarget
    ? undefined
    : {
        command: "pnpm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
