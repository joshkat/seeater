import { addGuests, createEventDoc, renameEventDoc, setBackdrop } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../../storage/db/SeatingDb";
import {
  createEvent,
  deleteEvent,
  getEventDoc,
  listEventSummaries,
  saveEventDoc,
} from "../../storage/repository/eventRepository";
import { runSync } from "../engine/runSync";
import { FakeServer } from "./fakeServer";

let db: SeatingDb;
let server: FakeServer;

beforeEach(() => {
  db = new SeatingDb(`sync-test-${crypto.randomUUID()}`);
  server = new FakeServer();
});

afterEach(async () => {
  await db.delete();
});

async function syncMeta(id: string) {
  return (await db.events.get(id))?.sync;
}

describe("runSync", () => {
  it("uploads new local events and marks them clean", async () => {
    const doc = createEventDoc({ name: "Local" });
    await createEvent(db, doc);

    const report = await runSync(db, server);

    expect(report.pushed).toBe(1);
    expect(server.rows.get(doc.id)?.version).toBe(1);
    expect(await syncMeta(doc.id)).toEqual({ baseVersion: 1, dirty: false, deleted: false });
  });

  it("downloads events created on another device", async () => {
    const theirs = createEventDoc({ name: "From laptop" });
    server.seed(theirs, 4);
    const changed: string[] = [];

    await runSync(db, server, (id) => changed.push(id));

    expect(await getEventDoc(db, theirs.id)).toEqual(theirs);
    expect(await syncMeta(theirs.id)).toEqual({ baseVersion: 4, dirty: false, deleted: false });
    expect(changed).toEqual([theirs.id]);
  });

  it("pushes subsequent edits at the right base version", async () => {
    const doc = createEventDoc({ name: "Gala" });
    await createEvent(db, doc);
    await runSync(db, server);

    await saveEventDoc(db, renameEventDoc(doc, "Spring Gala"));
    await runSync(db, server);

    expect(server.rows.get(doc.id)).toMatchObject({ version: 2 });
    expect(server.rows.get(doc.id)?.data?.name).toBe("Spring Gala");
    expect((await syncMeta(doc.id))?.dirty).toBe(false);
  });

  it("keeps both versions when the same event was edited on two devices", async () => {
    const doc = createEventDoc({ name: "Wedding" });
    await createEvent(db, doc);
    await runSync(db, server);

    // Another device renames it on the server (v2) while we add a guest offline.
    server.seed(renameEventDoc(doc, "Wedding (laptop edit)"), 2);
    await saveEventDoc(db, addGuests(doc, [{ name: "Ada" }]).doc);

    const report = await runSync(db, server);
    expect(report.forked).toBe(1);

    const names = (await listEventSummaries(db)).map((s) => s.name).sort();
    expect(names).toEqual(["Wedding (conflicted copy)", "Wedding (laptop edit)"]);

    // The original id now holds the server copy; our edits live in the copy.
    expect((await getEventDoc(db, doc.id))?.guests).toEqual([]);
    const summaries = await listEventSummaries(db);
    expect(summaries.find((s) => s.name.includes("conflicted"))?.guestCount).toBe(1);

    // The copy uploads on the next pass; nothing is lost.
    await runSync(db, server);
    expect(server.rows.size).toBe(2);
  });

  it("propagates a local delete to the server, then forgets it", async () => {
    const doc = createEventDoc({ name: "Old" });
    await createEvent(db, doc);
    await runSync(db, server);

    await deleteEvent(db, doc.id);
    await runSync(db, server);

    expect(server.rows.get(doc.id)).toMatchObject({ deleted: true, data: null });
    expect(await db.events.get(doc.id)).toBeUndefined();
  });

  it("removes events deleted on another device", async () => {
    const doc = createEventDoc({ name: "Gone" });
    await createEvent(db, doc);
    await runSync(db, server);

    await server.remove(doc.id, 1);
    await runSync(db, server);

    expect(await db.events.get(doc.id)).toBeUndefined();
  });

  it("restores an event deleted elsewhere if it has unsynced local edits", async () => {
    const doc = createEventDoc({ name: "Keep me" });
    await createEvent(db, doc);
    await runSync(db, server);

    await server.remove(doc.id, 1);
    await saveEventDoc(db, addGuests(doc, [{ name: "Grace" }]).doc);
    await runSync(db, server);

    expect(server.rows.get(doc.id)).toMatchObject({ version: 3, deleted: false });
    expect(server.rows.get(doc.id)?.data?.guests).toHaveLength(1);
  });

  it("throws on network failure without touching local data", async () => {
    const doc = createEventDoc({ name: "Offline" });
    await createEvent(db, doc);
    server.offline = true;

    await expect(runSync(db, server)).rejects.toThrow(TypeError);
    expect(await syncMeta(doc.id)).toEqual({ baseVersion: null, dirty: true, deleted: false });
  });
});

describe("runSync with shared events", () => {
  it("records role and owner for events shared with you, and keeps them current", async () => {
    const shared = createEventDoc({ name: "Their wedding" });
    server.seed(shared, 2, { role: "editor", ownerName: "Olive" });

    await runSync(db, server);
    expect(await syncMeta(shared.id)).toMatchObject({ role: "editor", ownerName: "Olive" });

    // Made a viewer without the document changing.
    server.rows.get(shared.id)!.role = "viewer";
    await runSync(db, server);
    expect(await syncMeta(shared.id)).toMatchObject({ role: "viewer", baseVersion: 2 });
  });

  it("never pushes a viewer's copy", async () => {
    const shared = createEventDoc({ name: "Look only" });
    server.seed(shared, 1, { role: "viewer" });
    await runSync(db, server);
    await saveEventDoc(db, renameEventDoc(shared, "Sneaky edit"));

    const report = await runSync(db, server);

    expect(server.rows.get(shared.id)?.data?.name).toBe("Look only");
    expect(report.forked).toBe(1);
    const names = (await listEventSummaries(db)).map((summary) => summary.name).sort();
    expect(names).toEqual(["Look only", "Sneaky edit (conflicted copy)"]);
  });

  it("forgets an event when access is removed, keeping unsynced edits as your copy", async () => {
    const clean = createEventDoc({ name: "Clean" });
    const edited = createEventDoc({ name: "Edited" });
    server.seed(clean, 1, { role: "viewer" });
    server.seed(edited, 1, { role: "editor" });
    await runSync(db, server);
    server.offline = true;
    await saveEventDoc(db, renameEventDoc(edited, "Edited offline"));
    server.offline = false;
    server.rows.delete(clean.id);
    server.rows.delete(edited.id);
    const changed: Array<[string, string | undefined]> = [];

    const report = await runSync(db, server, (id, replacedBy) => changed.push([id, replacedBy]));

    expect(await db.events.get(clean.id)).toBeUndefined();
    expect(await db.events.get(edited.id)).toBeUndefined();
    expect(report.keptCopies).toEqual(["Edited offline (copy)"]);
    const [copy] = await listEventSummaries(db);
    expect(copy?.name).toBe("Edited offline (copy)");
    // The copy is yours and was uploaded as a new event.
    expect(server.rows.get(copy!.id)?.role).toBeUndefined();
    expect(changed).toContainEqual([edited.id, copy!.id]);
  });

  it("leaves a shared event you deleted instead of deleting it for everyone", async () => {
    const shared = createEventDoc({ name: "Not mine" });
    server.seed(shared, 1, { role: "editor" });
    await runSync(db, server);
    await deleteEvent(db, shared.id);

    const report = await runSync(db, server);

    expect(report.left).toBe(1);
    expect(report.deleted).toBe(0);
    expect(server.left).toEqual([shared.id]);
    expect(await db.events.get(shared.id)).toBeUndefined();
  });

  it("re-ids an event whose id belongs to someone else, then uploads it", async () => {
    const doc = createEventDoc({ name: "Imported backup" });
    await createEvent(db, doc);
    server.foreignIds.add(doc.id);

    const report = await runSync(db, server);

    expect(report.reidentified).toBe(1);
    expect(await db.events.get(doc.id)).toBeUndefined();
    const [summary] = await listEventSummaries(db);
    expect(summary?.name).toBe("Imported backup");
    expect(server.rows.get(summary!.id)?.version).toBe(1);
  });

  it("uploads floor-plan images once and downloads ones this device lacks", async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const doc = setBackdrop(createEventDoc({ name: "With plan" }), "img-1");
    await createEvent(db, doc);
    await db.images.put({
      id: "img-1",
      eventId: doc.id,
      data: bytes,
      mimeType: "image/png",
      width: 10,
      height: 20,
      createdAt: new Date().toISOString(),
    });

    const first = await runSync(db, server);
    expect(first.imagesUploaded).toBe(1);
    expect(server.images.get(`${doc.id}/img-1`)?.width).toBe(10);
    expect((await runSync(db, server)).imagesUploaded).toBe(0);

    // Another device: same account, empty database.
    const other = new SeatingDb(`sync-test-${crypto.randomUUID()}`);
    try {
      const report = await runSync(other, server);
      expect(report.imagesDownloaded).toBe(1);
      const image = await other.images.get("img-1");
      expect(image).toMatchObject({ eventId: doc.id, mimeType: "image/png", width: 10 });
      expect(new Uint8Array(image!.data)).toEqual(new Uint8Array([1, 2, 3]));
    } finally {
      await other.delete();
    }
  });
});
