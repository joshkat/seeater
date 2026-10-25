import { defineConfig, devices } from "@playwright/test";

/** Port for the production preview the tests run against. Override with
 * E2E_PORT to run two checkouts' suites side by side (each reuses whatever
 * server is already on its port). */
// Not 4190: WebKit refuses it (a "restricted" port, ManageSieve).
const PORT = Number(process.env.E2E_PORT ?? 4280);

/**
 * End-to-end tests against the production build (`vite build` + `vite
 * preview`). Desktop Chrome, an 11" iPad Pro in WebKit (Safari's engine, with
 * touch) in both orientations — tablet layouts use drawers below 1280px wide —
 * and an iPhone for phone.spec.ts only.
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
      testIgnore: /phone\.spec/,
    },
    { name: "ipad-portrait", use: { ...devices["iPad Pro 11"] }, testIgnore: /phone\.spec/ },
    {
      name: "ipad-landscape",
      use: { ...devices["iPad Pro 11 landscape"] },
      testIgnore: /phone\.spec/,
    },
    // Phones get their own spec (the editor's compact layout, check-in).
    { name: "iphone", use: { ...devices["iPhone 13"] }, testMatch: /phone\.spec/ },
  ],
  webServer: {
    command: `npm run build --workspace @seating/web && npm run preview --workspace @seating/web -- --port ${PORT} --strictPort`,
    cwd: "../..",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
