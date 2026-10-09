import { addGuests, createEventDoc, renameEventDoc } from "@seating/shared";
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
