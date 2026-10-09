import { defineConfig } from "vitest/config";

// Unit tests for the web app's non-UI logic (storage, sync). They run in Node
// against an in-memory IndexedDB (fake-indexeddb), not a browser.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["fake-indexeddb/auto"],
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
