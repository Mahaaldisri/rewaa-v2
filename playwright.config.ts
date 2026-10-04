import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end coverage for the five critical flows:
 *   1. Search → product → cart → checkout
 *   2. Register / login
 *   3. Service booking
 *   4. Warranty claim
 *   5. Return request
 *
 * The dev server is started automatically against the mock service layer that
 * development builds use, so the flows are deterministic and need no backend.
 */
const PORT = Number(process.env.PORT || 4173);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "ar-SA",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1366, height: 900 },
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `./node_modules/.bin/vite --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
