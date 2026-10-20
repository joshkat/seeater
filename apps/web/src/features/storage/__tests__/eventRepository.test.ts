import { addGuests, createEventDoc, renameEventDoc } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../db/SeatingDb";
import {
  createEvent,
  deleteEvent,
  duplicateEvent,
  TRASH_RETENTION_DAYS,
  getEventDoc,
  listEventSummaries,
  listTrashedEvents,
  purgeExpiredTrash,
  renameEvent,
  restoreFromTrash,
  saveEventDoc,
  trashEvent,
} from "../repository/eventRepository";

let db: SeatingDb;

beforeEach(() => {
  db = new SeatingDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("eventRepository", () => {
  it("creates, lists newest-first, and reads back documents", async () => {
    const older = createEventDoc({ name: "Older", now: "2026-01-01T00:00:00.000Z" });
    const newer = createEventDoc({ name: "Newer", now: "2026-02-01T00:00:00.000Z" });
    await createEvent(db, older);
    await createEvent(db, newer);

    expect((await listEventSummaries(db)).map((s) => s.name)).toEqual(["Newer", "Older"]);
    expect(await getEventDoc(db, older.id)).toEqual(older);
  });

  it("saving stamps updatedAt, refreshes the summary and marks dirty", async () => {
    const doc = createEventDoc({ name: "Party", now: "2026-01-01T00:00:00.000Z" });
    await createEvent(db, doc);
    await db.events.update(doc.id, { sync: { baseVersion: 3, dirty: false, deleted: false } });

    const saved = await saveEventDoc(db, addGuests(doc, [{ name: "Ada" }]).doc);
    expect(saved?.updatedAt).not.toBe(doc.updatedAt);

    const record = await db.events.get(doc.id);
    expect(record?.summary.guestCount).toBe(1);
    expect(record?.sync).toEqual({ baseVersion: 3, dirty: true, deleted: false });
  });

  it("recreates a missing record on save instead of dropping the edit", async () => {
    const doc = createEventDoc({ name: "Moved mid-edit" });
    const saved = await saveEventDoc(db, doc);
    expect(saved?.name).toBe("Moved mid-edit");
    expect((await db.events.get(doc.id))?.sync).toEqual({
      baseVersion: null,
      dirty: true,
      deleted: false,
    });
  });

  it("deletes never-synced events outright", async () => {
    const doc = createEventDoc({ name: "Local only" });
    await createEvent(db, doc);
    await deleteEvent(db, doc.id);
    expect(await db.events.get(doc.id)).toBeUndefined();
  });

  it("tombstones synced events until sync confirms, and refuses to save over them", async () => {
    const doc = createEventDoc({ name: "Synced" });
    await createEvent(db, doc);
    await db.events.update(doc.id, { sync: { baseVersion: 1, dirty: false, deleted: false } });

    await deleteEvent(db, doc.id);
    const record = await db.events.get(doc.id);
    expect(record).toMatchObject({
      doc: null,
      sync: { baseVersion: 1, dirty: true, deleted: true },
    });
    expect(await listEventSummaries(db)).toEqual([]);
    expect(await getEventDoc(db, doc.id)).toBeNull();

    // A stale editor tab saving after the delete must not resurrect it.
    expect(await saveEventDoc(db, doc)).toBeNull();
    expect((await db.events.get(doc.id))?.sync.deleted).toBe(true);
  });

  it("renames and duplicates", async () => {
    const doc = createEventDoc({ name: "Gala" });
    await createEvent(db, doc);
    await renameEvent(db, doc.id, "Spring Gala");
    const copyId = await duplicateEvent(db, doc.id, {});

    const names = (await listEventSummaries(db)).map((s) => s.name).sort();
    expect(names).toEqual(["Spring Gala", "Spring Gala (copy)"]);
    expect(copyId).not.toBe(doc.id);
  });

  it("trash hides an event, keeps it restorable, and survives saves", async () => {
    const doc = createEventDoc({ name: "Wedding" });
    await createEvent(db, doc);
    await trashEvent(db, doc.id, new Date("2026-10-01T00:00:00.000Z"));

    expect(await listEventSummaries(db)).toEqual([]);
    expect(await getEventDoc(db, doc.id)).toBeNull();
    const [trashed] = await listTrashedEvents(db);
    expect(trashed).toMatchObject({
      summary: { name: "Wedding" },
      trashedAt: "2026-10-01T00:00:00.000Z",
      purgeAt: "2026-10-31T00:00:00.000Z",
    });

    // A stale editor tab saving doesn't pull it out of the trash.
    await saveEventDoc(db, renameEventDoc(doc, "Wedding!"));
    expect(await listEventSummaries(db)).toEqual([]);

    await restoreFromTrash(db, doc.id);
    expect((await listEventSummaries(db)).map((s) => s.name)).toEqual(["Wedding!"]);
    expect(await listTrashedEvents(db)).toEqual([]);
  });

  it(`purges events trashed more than ${TRASH_RETENTION_DAYS} days ago`, async () => {
    const old = createEventDoc({ name: "Old" });
    const recent = createEventDoc({ name: "Recent" });
    await createEvent(db, old);
    await createEvent(db, recent);
    await trashEvent(db, old.id, new Date("2026-09-01T00:00:00.000Z"));
    await trashEvent(db, recent.id, new Date("2026-10-15T00:00:00.000Z"));

    expect(await purgeExpiredTrash(db, new Date("2026-10-20T00:00:00.000Z"))).toBe(1);
    expect(await db.events.get(old.id)).toBeUndefined();
    expect((await listTrashedEvents(db)).map((t) => t.summary.name)).toEqual(["Recent"]);
  });
});
