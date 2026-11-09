import { randomUUID } from "node:crypto";

import { EDIT_LOCK_TTL_MS, type EventDoc, createEventDoc, renameEventDoc } from "@seating/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../../app.js";
import { LockService } from "../lock.service.js";

/**
 * Sharing against a real Postgres, in keyless mode: each fake user is an
 * `x-owner-id` + `x-owner-email` pair. Fresh ids per run, cleaned up after.
 */

interface User {
  id: string;
  email: string;
  name: string;
}

function user(name: string): User {
  const id = `test-${randomUUID()}`;
  return { id, email: `${id}@example.com`, name };
}

const owner = user("Olive");
const editor = user("Eddie");
const viewer = user("Vera");
const stranger = user("Stan");

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ rateLimitMax: 10_000 });
});

afterAll(async () => {
  const ids = [owner, editor, viewer, stranger].map((u) => u.id);
  await app.prisma.eventDocument.deleteMany({ where: { ownerId: { in: ids } } });
  await app.close();
});

function headers(as: User) {
  return { "x-owner-id": as.id, "x-owner-email": as.email, "x-owner-name": as.name };
}

function call(as: User | null, method: string, url: string, payload?: unknown) {
  return app.inject({
    method: method as "GET",
    url,
    headers: as ? headers(as) : {},
    ...(payload === undefined ? {} : { payload: payload as object }),
  });
}

async function createShared(): Promise<EventDoc> {
  const doc = createEventDoc({ name: "Shared wedding" });
  expect(
    (await call(owner, "PUT", `/api/events/${doc.id}`, { baseVersion: null, data: doc }))
      .statusCode,
  ).toBe(200);
  for (const [who, role] of [
    [editor, "editor"],
    [viewer, "viewer"],
  ] as const) {
    const invited = await call(owner, "POST", `/api/events/${doc.id}/members`, {
      email: who.email.toUpperCase(),
      role,
    });
    expect(invited.statusCode).toBe(200);
  }
  return doc;
}

async function listFor(as: User) {
  return (await call(as, "GET", "/api/events")).json().events as Array<Record<string, unknown>>;
}

describe("invites and roles", () => {
  it("shows shared events to invitees with their role and the owner's name", async () => {
    const doc = await createShared();

    const mine = (await listFor(owner)).find((event) => event.id === doc.id);
    expect(mine).toMatchObject({ role: "owner", memberCount: 2, ownerName: "Olive" });

    const theirs = (await listFor(editor)).find((event) => event.id === doc.id);
    expect(theirs).toMatchObject({ role: "editor", ownerName: "Olive", memberCount: 0 });
    expect((await listFor(viewer)).find((event) => event.id === doc.id)?.role).toBe("viewer");
    expect((await listFor(stranger)).find((event) => event.id === doc.id)).toBeUndefined();

    const sharing = (await call(owner, "GET", `/api/events/${doc.id}/members`)).json();
    expect(sharing.members).toEqual([
      { email: editor.email, role: "editor", accepted: true },
      { email: viewer.email, role: "viewer", accepted: true },
    ]);
    expect(sharing.link).toEqual({ enabled: false, token: null });
  });

  it("lets editors write but not delete or manage sharing", async () => {
    const doc = await createShared();
    await listFor(editor);
    const edited = await call(editor, "PUT", `/api/events/${doc.id}`, {
      baseVersion: 1,
      data: renameEventDoc(doc, "Edited by Eddie"),
    });
    expect(edited.json()).toEqual({ id: doc.id, version: 2 });
    // The owner's name isn't overwritten by an editor's write.
    expect((await listFor(owner)).find((e) => e.id === doc.id)?.ownerName).toBe("Olive");

    expect((await call(editor, "DELETE", `/api/events/${doc.id}?baseVersion=2`)).statusCode).toBe(
      403,
    );
    expect(
      (
        await call(editor, "POST", `/api/events/${doc.id}/members`, {
          email: "x@example.com",
          role: "editor",
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await call(editor, "POST", `/api/events/${doc.id}/share-link`, { enabled: true }))
        .statusCode,
    ).toBe(403);
    const seen = (await call(editor, "GET", `/api/events/${doc.id}/members`)).json();
    expect(seen.link).toBeNull();
    expect(seen.members).toHaveLength(2);
  });

  it("lets viewers read only", async () => {
    const doc = await createShared();
    await listFor(viewer);
    expect((await call(viewer, "GET", `/api/events/${doc.id}`)).json().data.name).toBe(
      "Shared wedding",
    );
    const write = await call(viewer, "PUT", `/api/events/${doc.id}`, { baseVersion: 1, data: doc });
    expect(write.statusCode).toBe(403);
    expect((await call(viewer, "GET", `/api/events/${doc.id}/members`)).statusCode).toBe(403);
    expect(
      (await call(viewer, "PUT", `/api/events/${doc.id}/lock`, { clientId: "viewer-tab-1" }))
        .statusCode,
    ).toBe(403);
  });

  it("hides everything from strangers", async () => {
    const doc = await createShared();
    for (const url of [
      `/api/events/${doc.id}`,
      `/api/events/${doc.id}/members`,
      `/api/events/${doc.id}/lock`,
      `/api/events/${doc.id}/images`,
    ]) {
      expect((await call(stranger, "GET", url)).statusCode, url).toBe(404);
    }
  });

  it("removes access when the owner removes someone or they leave", async () => {
    const doc = await createShared();
    await listFor(editor);
    await listFor(viewer);

    const removed = await call(
      owner,
      "DELETE",
      `/api/events/${doc.id}/members/${encodeURIComponent(editor.email)}`,
    );
    expect(removed.json().members.map((m: { email: string }) => m.email)).toEqual([viewer.email]);
    expect((await listFor(editor)).find((e) => e.id === doc.id)).toBeUndefined();
    expect((await call(editor, "GET", `/api/events/${doc.id}`)).statusCode).toBe(404);

    expect((await call(viewer, "DELETE", `/api/events/${doc.id}/membership`)).statusCode).toBe(204);
    expect((await listFor(viewer)).find((e) => e.id === doc.id)).toBeUndefined();
  });

  it("changes roles, rejects inviting yourself, and tells members about a delete", async () => {
    const doc = await createShared();
    await listFor(editor);
    const changed = await call(
      owner,
      "PATCH",
      `/api/events/${doc.id}/members/${encodeURIComponent(editor.email)}`,
      {
        role: "viewer",
      },
    );
    expect(changed.statusCode).toBe(200);
    expect((await listFor(editor)).find((e) => e.id === doc.id)?.role).toBe("viewer");

    const self = await call(owner, "POST", `/api/events/${doc.id}/members`, {
      email: owner.email,
      role: "editor",
    });
    expect(self.statusCode).toBe(400);

    expect((await call(owner, "DELETE", `/api/events/${doc.id}?baseVersion=1`)).statusCode).toBe(
      204,
    );
    expect((await listFor(editor)).find((e) => e.id === doc.id)).toMatchObject({ deleted: true });
  });

  it("matches a pending invite only to that email", async () => {
    const doc = createEventDoc({ name: "Pending" });
    await call(owner, "PUT", `/api/events/${doc.id}`, { baseVersion: null, data: doc });
    const later = user("Later");
    await call(owner, "POST", `/api/events/${doc.id}/members`, {
      email: later.email,
      role: "viewer",
    });
    expect(
      (await call(owner, "GET", `/api/events/${doc.id}/members`)).json().members[0].accepted,
    ).toBe(false);
    // Someone signed in without that email doesn't get it.
    expect((await listFor(stranger)).find((e) => e.id === doc.id)).toBeUndefined();
    expect((await listFor(later)).find((e) => e.id === doc.id)?.role).toBe("viewer");
    await app.prisma.eventMember.deleteMany({ where: { userId: later.id } });
  });
});

describe("public link", () => {
  it("works only while on, and regenerating breaks old links", async () => {
    const doc = await createShared();
    const on = (
      await call(owner, "POST", `/api/events/${doc.id}/share-link`, { enabled: true })
    ).json();
    expect(on.enabled).toBe(true);
    expect(on.token).toMatch(/^[\w-]{40,}$/);

    const shared = await call(null, "GET", `/api/shared/${on.token}`);
    expect(shared.statusCode).toBe(200);
    expect(shared.headers["cache-control"]).toBe("no-store");
    expect(shared.json()).toMatchObject({
      id: doc.id,
      ownerName: "Olive",
      data: { name: "Shared wedding" },
    });

    const fresh = (
      await call(owner, "POST", `/api/events/${doc.id}/share-link`, {
        enabled: true,
        regenerate: true,
      })
    ).json();
    expect(fresh.token).not.toBe(on.token);
    expect((await call(null, "GET", `/api/shared/${on.token}`)).statusCode).toBe(404);
    expect((await call(null, "GET", `/api/shared/${fresh.token}`)).statusCode).toBe(200);

    // Off keeps the token (turning it back on revives the same link).
    await call(owner, "POST", `/api/events/${doc.id}/share-link`, { enabled: false });
    expect((await call(null, "GET", `/api/shared/${fresh.token}`)).statusCode).toBe(404);
    const again = (
      await call(owner, "POST", `/api/events/${doc.id}/share-link`, { enabled: true })
    ).json();
    expect(again.token).toBe(fresh.token);

    // Deleting the event kills the link.
    await call(owner, "DELETE", `/api/events/${doc.id}?baseVersion=1`);
    expect((await call(null, "GET", `/api/shared/${fresh.token}`)).statusCode).toBe(404);
  });

  it("404s on unknown tokens", async () => {
    expect((await call(null, "GET", `/api/shared/${"x".repeat(43)}`)).statusCode).toBe(404);
  });
});

describe("edit lock", () => {
  it("is held by one tab at a time; others see who, and can take over", async () => {
    const doc = await createShared();
    await listFor(editor);
    await listFor(viewer);
    const lock = (as: User, clientId: string, force?: boolean) =>
      call(as, "PUT", `/api/events/${doc.id}/lock`, { clientId, ...(force ? { force } : {}) });

    expect((await lock(owner, "owner-tab-1")).json().held).toBe(true);
    // Renewing from the same tab keeps it.
    expect((await lock(owner, "owner-tab-1")).json().held).toBe(true);

    const blocked = (await lock(editor, "editor-tab-1")).json();
    expect(blocked).toMatchObject({ held: false, holder: { name: "Olive", isYou: false } });
    // The owner's other tab sees it's them.
    expect((await lock(owner, "owner-tab-2")).json().holder.isYou).toBe(true);

    expect((await lock(editor, "editor-tab-1", true)).json().held).toBe(true);
    expect((await lock(owner, "owner-tab-1")).json()).toMatchObject({
      held: false,
      holder: { name: "Eddie" },
    });

    const status = (await call(viewer, "GET", `/api/events/${doc.id}/lock`)).json();
    expect(status.holder.name).toBe("Eddie");

    await call(editor, "DELETE", `/api/events/${doc.id}/lock?clientId=editor-tab-1`);
    expect((await call(owner, "GET", `/api/events/${doc.id}/lock`)).json().holder).toBeNull();
  });

  it("lapses after the TTL, and demoting an editor drops their lock", async () => {
    const doc = await createShared();
    await listFor(editor);
    const service = new LockService(app.prisma);
    const as = (u: User) => ({ userId: u.id, email: u.email, name: u.name });
    const start = new Date();
    expect((await service.acquire(as(editor), doc.id, "editor-tab-1", false, start)).held).toBe(
      true,
    );
    const later = new Date(start.getTime() + EDIT_LOCK_TTL_MS + 1);
    expect((await service.acquire(as(owner), doc.id, "owner-tab-1", false, start)).held).toBe(
      false,
    );
    expect((await service.acquire(as(owner), doc.id, "owner-tab-1", false, later)).held).toBe(true);

    await service.acquire(as(editor), doc.id, "editor-tab-1", true);
    await call(
      owner,
      "PATCH",
      `/api/events/${doc.id}/members/${encodeURIComponent(editor.email)}`,
      {
        role: "viewer",
      },
    );
    expect((await service.status(as(owner), doc.id)).holder).toBeNull();
  });
});

describe("floor-plan images", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const upload = (as: User, eventId: string, id: string, type = "image/png") =>
    app.inject({
      method: "PUT",
      url: `/api/events/${eventId}/images/${id}`,
      headers: {
        ...headers(as),
        "content-type": type,
        "x-image-width": "800",
        "x-image-height": "600",
      },
      payload: png,
    });

  it("stores bytes for writers and serves them to anyone with access", async () => {
    const doc = await createShared();
    await listFor(editor);
    await listFor(viewer);
    expect((await upload(editor, doc.id, "img-1")).statusCode).toBe(204);
    // Write-once: a second upload of the same id is a no-op.
    expect((await upload(owner, doc.id, "img-1")).statusCode).toBe(204);
    expect((await upload(viewer, doc.id, "img-2")).statusCode).toBe(403);
    expect((await upload(stranger, doc.id, "img-3")).statusCode).toBe(404);
    expect((await upload(owner, doc.id, "img-4", "image/svg+xml")).statusCode).toBe(400);

    const listed = (await call(viewer, "GET", `/api/events/${doc.id}/images`)).json();
    expect(listed.images).toEqual([
      { id: "img-1", mimeType: "image/png", width: 800, height: 600 },
    ]);
    const bytes = await call(viewer, "GET", `/api/events/${doc.id}/images/img-1`);
    expect(bytes.headers["content-type"]).toBe("image/png");
    expect(bytes.rawPayload.equals(png)).toBe(true);
    expect((await call(stranger, "GET", `/api/events/${doc.id}/images/img-1`)).statusCode).toBe(
      404,
    );

    const { token } = (
      await call(owner, "POST", `/api/events/${doc.id}/share-link`, { enabled: true })
    ).json();
    expect(
      (await call(null, "GET", `/api/shared/${token}/images/img-1`)).rawPayload.equals(png),
    ).toBe(true);
    await call(owner, "POST", `/api/events/${doc.id}/share-link`, { enabled: false });
    expect((await call(null, "GET", `/api/shared/${token}/images/img-1`)).statusCode).toBe(404);
  });
});
