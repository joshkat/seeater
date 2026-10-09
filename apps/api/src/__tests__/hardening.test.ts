import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ rateLimitMax: 3 });
});

afterAll(async () => {
  await app.close();
});

const list = () =>
  app.inject({ method: "GET", url: "/api/events", headers: { "x-owner-id": "test-hardening" } });

describe("API hardening", () => {
  it("sends standard security headers", async () => {
    const response = await list();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    // Readable cross-origin (the web app calls the API from another origin).
    expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("rate-limits a client after the per-minute cap", async () => {
    const fresh = await buildApp({ rateLimitMax: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const response = await fresh.inject({
        method: "GET",
        url: "/api/events",
        headers: { "x-owner-id": "test-hardening" },
      });
      statuses.push(response.statusCode);
    }
    await fresh.close();
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("never rate-limits the health check", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    }
  });
});
