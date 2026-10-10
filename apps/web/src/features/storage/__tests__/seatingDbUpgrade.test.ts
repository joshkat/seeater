import { addGuests, createEventDoc, summarizeEventDoc } from "@seating/shared";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../db/SeatingDb";
import { getEventDoc } from "../repository/eventRepository";

const name = `upgrade-${crypto.randomUUID()}`;

afterEach(async () => {
  await Dexie.delete(name);
});

/** A record as the v1 app stored it: no households, no guest.householdId. */
function v1Record() {
  const { doc } = addGuests(createEventDoc({ name: "Old wedding" }), [{ name: "Ada" }]);
  const { households: _households, ...rest } = doc;
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
    expect(upgraded).toMatchObject({ schemaVersion: 2, households: [] });
    expect(upgraded?.guests[0]).toMatchObject({ name: "Ada", householdId: null });
  });
});
