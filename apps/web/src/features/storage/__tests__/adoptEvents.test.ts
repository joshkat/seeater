import { createEventDoc, renameEventDoc } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../db/SeatingDb";
import { adoptEvents } from "../repository/adoptEvents";
import { createEvent, getEventDoc, listEventSummaries } from "../repository/eventRepository";

let signedOut: SeatingDb;
let account: SeatingDb;

beforeEach(() => {
  signedOut = new SeatingDb(`local-${crypto.randomUUID()}`);
  account = new SeatingDb(`account-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await signedOut.delete();
  await account.delete();
});

describe("adoptEvents", () => {
  it("moves signed-out events into the account as never-synced and dirty", async () => {
    const doc = createEventDoc({ name: "Made while signed out" });
    await createEvent(signedOut, doc);

    expect(await adoptEvents(signedOut, account)).toBe(1);

    expect(await listEventSummaries(signedOut)).toEqual([]);
    expect(await getEventDoc(account, doc.id)).toEqual(doc);
    expect((await account.events.get(doc.id))?.sync).toEqual({
      baseVersion: null,
      dirty: true,
      deleted: false,
    });
  });

  it("keeps the newer copy when both databases have the same event", async () => {
    const older = createEventDoc({ name: "Old", now: "2026-01-01T00:00:00.000Z" });
    const newer = { ...renameEventDoc(older, "New"), updatedAt: "2026-02-01T00:00:00.000Z" };
    await createEvent(account, newer);
    await createEvent(signedOut, older);

    await adoptEvents(signedOut, account);

    expect((await getEventDoc(account, older.id))?.name).toBe("New");
  });

  it("brings the events' floor-plan pictures along", async () => {
    const doc = createEventDoc({ name: "With a plan" });
    await createEvent(signedOut, doc);
    await signedOut.images.put({
      id: "img-1",
      eventId: doc.id,
      data: new Uint8Array([7]).buffer,
      mimeType: "image/png",
      width: 1,
      height: 1,
      createdAt: doc.createdAt,
    });

    await adoptEvents(signedOut, account);

    expect(await account.images.get("img-1")).toMatchObject({ eventId: doc.id, width: 1 });
    expect(await signedOut.images.count()).toBe(0);
  });
});
