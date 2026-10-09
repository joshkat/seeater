import { randomUUID } from "node:crypto";

import { type EventDoc, addTable, createEventDoc, renameEventDoc } from "@seating/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../../app.js";

/**
 * Integration tests against a real Postgres (DATABASE_URL, e.g. the
 * docker-compose service). Runs in keyless mode, so the owner comes from the
 * x-owner-id header; each run uses fresh owner ids and cleans up after itself.
 */

let app: FastifyInstance;
const owner = `test-${randomUUID()}`;
const otherOwner = `test-${randomUUID()}`;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.prisma.eventDocument.deleteMany({ where: { ownerId: { in: [owner, otherOwner] } } });
  await app.close();
});

function sampleDoc(): EventDoc {
  const doc = createEventDoc({ name: "Integration" });
  return addTable(doc, { shape: "round", position: { x: 200, y: 200 } }).doc;
}

function put(doc: EventDoc, baseVersion: number | null, as = owner) {
  return app.inject({
    method: "PUT",
    url: `/api/events/${doc.id}`,
    headers: { "x-owner-id": as },
    payload: { baseVersion, data: doc },
  });
}

function get(url: string, as = owner) {
  return app.inject({ method: "GET", url, headers: { "x-owner-id": as } });
}

describe("PUT /api/events/:id", () => {
  it("creates at version 1 and returns the stored document", async () => {
    const doc = sampleDoc();
    const created = await put(doc, null);
    expect(created.statusCode).toBe(200);
    expect(created.json()).toEqual({ id: doc.id, version: 1 });

    const fetched = await get(`/api/events/${doc.id}`);
    expect(fetched.json()).toMatchObject({ id: doc.id, version: 1, deleted: false, data: doc });
  });

  it("accepts a write at the current version and rejects a stale one with 409", async () => {
    const doc = sampleDoc();
    await put(doc, null);

    const renamed = renameEventDoc(doc, "Renamed");
    const ok = await put(renamed, 1);
    expect(ok.json()).toEqual({ id: doc.id, version: 2 });

    const stale = await put(renameEventDoc(doc, "Stale"), 1);
    expect(stale.statusCode).toBe(409);
    expect(stale.json().current).toEqual({ version: 2, deleted: false });

    const list = await get("/api/events");
    expect(list.json().events.find((e: { id: string }) => e.id === doc.id)).toMatchObject({
      name: "Renamed",
      version: 2,
    });
  });

  it("rejects creating something that already exists", async () => {
    const doc = sampleDoc();
    await put(doc, null);
    const again = await put(doc, null);
    expect(again.statusCode).toBe(409);
  });

  it("rejects invalid documents and mismatched ids", async () => {
    const doc = sampleDoc();
    const invalid = await put({ ...doc, name: "" }, null);
    expect(invalid.statusCode).toBe(400);

    const mismatched = await app.inject({
      method: "PUT",
      url: `/api/events/${randomUUID()}`,
      headers: { "x-owner-id": owner },
      payload: { baseVersion: null, data: doc },
    });
    expect(mismatched.statusCode).toBe(400);
  });
});

describe("DELETE /api/events/:id", () => {
  it("tombstones at the current version, clears data, and is idempotent", async () => {
    const doc = sampleDoc();
    await put(doc, null);

    const stale = await app.inject({
      method: "DELETE",
      url: `/api/events/${doc.id}?baseVersion=7`,
      headers: { "x-owner-id": owner },
    });
    expect(stale.statusCode).toBe(409);

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/events/${doc.id}?baseVersion=1`,
      headers: { "x-owner-id": owner },
    });
    expect(removed.statusCode).toBe(204);

    const tombstone = await get(`/api/events/${doc.id}`);
    expect(tombstone.json()).toMatchObject({ version: 2, deleted: true, data: null });

    const missing = await app.inject({
      method: "DELETE",
      url: `/api/events/${randomUUID()}?baseVersion=1`,
      headers: { "x-owner-id": owner },
    });
    expect(missing.statusCode).toBe(204);
  });

  it("restores a tombstone when written at its version", async () => {
    const doc = sampleDoc();
    await put(doc, null);
    await app.inject({
      method: "DELETE",
      url: `/api/events/${doc.id}?baseVersion=1`,
      headers: { "x-owner-id": owner },
    });
    const restored = await put(doc, 2);
    expect(restored.json()).toEqual({ id: doc.id, version: 3 });
    expect((await get(`/api/events/${doc.id}`)).json().deleted).toBe(false);
  });
});

describe("ownership", () => {
  it("never exposes or overwrites another owner's document", async () => {
    const doc = sampleDoc();
    await put(doc, null);

    expect((await get(`/api/events/${doc.id}`, otherOwner)).statusCode).toBe(404);
    expect((await get("/api/events", otherOwner)).json().events).toEqual([]);

    // Same id under another owner is a separate row, not an overwrite.
    const theirs = await put(renameEventDoc(doc, "Theirs"), null, otherOwner);
    expect(theirs.json()).toEqual({ id: doc.id, version: 1 });
    expect((await get(`/api/events/${doc.id}`)).json().data.name).toBe("Integration");
  });
});
