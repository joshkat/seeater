import { addGuests, createEventDoc, EventDocError } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../../storage/db/SeatingDb";
import {
  createEvent,
  importEvent,
  listEventSummaries,
} from "../../storage/repository/eventRepository";
import { backupFileName, parseBackup, serializeBackup } from "../lib/backupFile";

describe("backup files", () => {
  it("round-trips an event", () => {
    const doc = addGuests(createEventDoc({ name: "Gala" }), [{ name: "Ada" }]).doc;
    expect(parseBackup(serializeBackup(doc))).toEqual(doc);
  });

  it("accepts a bare event document", () => {
    const doc = createEventDoc({ name: "Bare" });
    expect(parseBackup(JSON.stringify(doc))).toEqual(doc);
  });

  it("rejects non-JSON, foreign JSON and newer schema versions with readable errors", () => {
    expect(() => parseBackup("not json")).toThrow("isn't valid JSON");
    expect(() => parseBackup(JSON.stringify({ format: "something-else" }))).toThrow(
      "isn't a seating chart backup",
    );
    const future = { ...createEventDoc({ name: "Future" }), schemaVersion: 99 };
    expect(() => parseBackup(JSON.stringify(future))).toThrow(EventDocError);
  });

  it("builds safe file names", () => {
    expect(backupFileName("Sarah & Tom's Wedding!")).toBe("sarah-tom-s-wedding.seating.json");
    expect(backupFileName("🎉")).toBe("event.seating.json");
  });
});

describe("importEvent", () => {
  let db: SeatingDb;
  beforeEach(() => {
    db = new SeatingDb(`backup-${crypto.randomUUID()}`);
  });
  afterEach(async () => {
    await db.delete();
  });

  it("imports a copy instead of overwriting when the id already exists", async () => {
    const doc = createEventDoc({ name: "Twice" });
    await createEvent(db, doc);
    const imported = await importEvent(db, doc);

    expect(imported.id).not.toBe(doc.id);
    expect((await listEventSummaries(db)).map((s) => s.name).sort()).toEqual([
      "Twice",
      "Twice (imported)",
    ]);
  });
});
