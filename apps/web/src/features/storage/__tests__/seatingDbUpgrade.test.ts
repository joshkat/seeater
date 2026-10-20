import {
  EVENT_DOC_SCHEMA_VERSION,
  addGuests,
  createEventDoc,
  summarizeEventDoc,
} from "@seating/shared";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_VERSION, SeatingDb } from "../db/SeatingDb";
import { getEventDoc } from "../repository/eventRepository";

const name = `upgrade-${crypto.randomUUID()}`;

afterEach(async () => {
  await Dexie.delete(name);
});

/** A record as the v1 app stored it: no households, no guest.householdId, no settings. */
function v1Record() {
  const { doc } = addGuests(createEventDoc({ name: "Old wedding" }), [{ name: "Ada" }]);
  const { households: _households, settings: _settings, ...rest } = doc;
  const legacyDoc = {
    ...rest,
    schemaVersion: 1,
    guests: rest.guests.map(({ householdId: _householdId, ...guest }) => guest),
  };
  return {
    id: doc.id,
    doc: legacyDoc,
    summary: summarizeEventDoc(doc),
    updatedAt: doc.updatedAt,
    sync: { baseVersion: null, dirty: true, deleted: false },
  };
}

describe("SeatingDb upgrade", () => {
  it("brings documents stored by an older app up to the current schema", async () => {
    const legacy = new Dexie(name);
    legacy.version(1).stores({ events: "id, updatedAt" });
    const record = v1Record();
    await legacy.table("events").put(record);
    legacy.close();

    const db = new SeatingDb(name);
    const upgraded = await getEventDoc(db, record.id);
    db.close();
    expect(upgraded).toMatchObject({
      schemaVersion: EVENT_DOC_SCHEMA_VERSION,
      households: [],
      settings: { exactSeatPlacement: "auto" },
    });
    expect(upgraded?.guests[0]).toMatchObject({ name: "Ada", householdId: null });
  });

  it("adds the versions store to a database from the previous release (v3)", async () => {
    const doc = createEventDoc({ name: "Current" });
    const previous = new Dexie(name);
    previous.version(3).stores({ events: "id, updatedAt" });
    await previous.table("events").put({
      id: doc.id,
      doc,
      summary: summarizeEventDoc(doc),
      updatedAt: doc.updatedAt,
      sync: { baseVersion: null, dirty: true, deleted: false },
    });
    previous.close();

    const db = new SeatingDb(name);
    expect(await getEventDoc(db, doc.id)).toEqual(doc);
    expect(await db.versions.count()).toBe(0);
    expect(db.verno).toBe(DATABASE_VERSION);
    db.close();
  });
});
