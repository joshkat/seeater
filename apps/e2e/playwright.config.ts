import { defineConfig, devices } from "@playwright/test";

/** Port for the production preview the tests run against. */
// Not 4190: WebKit refuses it (a "restricted" port, ManageSieve).
const PORT = 4280;

/**
 * End-to-end tests against the production build (`vite build` + `vite
 * preview`). Three projects: desktop Chrome, and an 11" iPad Pro in WebKit
 * (Safari's engine, with touch) in both orientations — tablet layouts use
 * drawers below 1280px wide.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Each test gets a fresh browser context (and so fresh IndexedDB); the
    // PWA service worker would only add caching noise.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "ipad-portrait", use: { ...devices["iPad Pro 11"] } },
    { name: "ipad-landscape", use: { ...devices["iPad Pro 11 landscape"] } },
  ],
  webServer: {
    command: `npm run build --workspace @seating/web && npm run preview --workspace @seating/web -- --port ${PORT} --strictPort`,
    cwd: "../..",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
