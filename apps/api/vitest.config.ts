import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests run many sequential queries against a real Postgres;
    // the 5 s default is too tight on a busy machine (e.g. with e2e running).
    testTimeout: 20_000,
  },
});
