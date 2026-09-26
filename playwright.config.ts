import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// API_URI points the app at the local CDN stand-in served by `pnpm test:e2e:data`; PORT is the app's port
if (existsSync(".env.test")) {
  process.loadEnvFile(".env.test");
}

const BASE_URL = `http://localhost:${process.env.PORT}`;

// See https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: process.env.CI ? [["html"], ["junit", { outputFile: "playwright-report/junit.xml" }]] : "html",
  // Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The production build registers a Serwist service worker, which would cache pages and data across
    // tests and hide page.route() mocks. The PWA spec opts back in with test.use({ serviceWorkers: "allow" }).
    serviceWorkers: "block",
  },
  timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT ? Number(process.env.PLAYWRIGHT_TEST_TIMEOUT) : 30000,
  expect: {
    timeout: process.env.PLAYWRIGHT_TEST_EXPECT_TIMEOUT ? Number(process.env.PLAYWRIGHT_TEST_EXPECT_TIMEOUT) : 5000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // Local copy of the Qur'an data CDN (see scripts/fetch-e2e-fixtures.mjs)
      command: "pnpm test:e2e:data",
      url: `${process.env.API_URI}/data/resources/chapters.json`,
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
    },
    {
      command: "pnpm test:e2e:start",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300 * 1000,
    },
  ],
});
