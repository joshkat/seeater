import { addGuests, createEventDoc, renameEventDoc } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../db/SeatingDb";
import { createEvent, deleteEvent } from "../repository/eventRepository";
import {
  AUTO_VERSION_LIMIT,
  deleteVersion,
  listVersions,
  saveVersion,
} from "../repository/versionRepository";

let db: SeatingDb;

beforeEach(() => {
  db = new SeatingDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

const at = (minute: number) => new Date(Date.UTC(2026, 9, 20, 12, minute));

describe("versionRepository", () => {
  it("lists an event's versions newest first", async () => {
    const doc = createEventDoc({ name: "Gala" });
    await saveVersion(db, doc, { kind: "auto", label: "Opened", now: at(0) });
    await saveVersion(db, renameEventDoc(doc, "Gala 2"), {
      kind: "named",
      label: "Draft",
      now: at(5),
    });
    await saveVersion(db, createEventDoc({ name: "Other" }), {
      kind: "auto",
      label: "x",
      now: at(9),
    });

    const versions = await listVersions(db, doc.id);
    expect(versions.map((v) => v.label)).toEqual(["Draft", "Opened"]);
    expect(versions[0]).toMatchObject({ kind: "named", summary: { name: "Gala 2" } });
  });

  it("skips an automatic version when nothing changed (ignoring updatedAt)", async () => {
    const doc = createEventDoc({ name: "Gala" });
    expect(
      await saveVersion(db, doc, { kind: "auto", label: "Opened", now: at(0) }),
    ).not.toBeNull();
    const resaved = { ...doc, updatedAt: "2027-01-01T00:00:00.000Z" };
    expect(
      await saveVersion(db, resaved, { kind: "auto", label: "Autosave", now: at(1) }),
    ).toBeNull();
    // Named saves always go through.
    expect(await saveVersion(db, resaved, { kind: "named", label: "", now: at(2) })).toMatchObject({
      label: "Saved version",
    });
  });

  it("keeps only the newest automatic versions, never pruning named ones", async () => {
    let doc = createEventDoc({ name: "Gala" });
    await saveVersion(db, doc, { kind: "named", label: "Keep me", now: at(0) });
    for (let i = 1; i <= AUTO_VERSION_LIMIT + 5; i += 1) {
      doc = addGuests(doc, [{ name: `G${i}` }]).doc;
      await saveVersion(db, doc, {
        kind: "auto",
        label: "Autosave",
        now: new Date(at(0).getTime() + i * 1000),
      });
    }
    const versions = await listVersions(db, doc.id);
    expect(versions.filter((v) => v.kind === "auto")).toHaveLength(AUTO_VERSION_LIMIT);
    expect(versions.at(-1)?.label).toBe("Keep me");
    expect(versions[0].summary.guestCount).toBe(AUTO_VERSION_LIMIT + 5);
  });

  it("deletes one version, or all of them with the event", async () => {
    const doc = createEventDoc({ name: "Gala" });
    await createEvent(db, doc);
    const first = await saveVersion(db, doc, { kind: "named", label: "A", now: at(0) });
    await saveVersion(db, renameEventDoc(doc, "B"), { kind: "named", label: "B", now: at(1) });
    await deleteVersion(db, first!.id);
    expect((await listVersions(db, doc.id)).map((v) => v.label)).toEqual(["B"]);
    await deleteEvent(db, doc.id);
    expect(await listVersions(db, doc.id)).toEqual([]);
  });
});
