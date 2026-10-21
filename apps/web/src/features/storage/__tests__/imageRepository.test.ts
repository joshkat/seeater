import { createEventDoc } from "@seating/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SeatingDb } from "../db/SeatingDb";
import { createEvent, deleteEvent } from "../repository/eventRepository";
import { MAX_IMAGE_BYTES, getImage, pruneImages, saveImage } from "../repository/imageRepository";

let db: SeatingDb;

beforeEach(() => {
  db = new SeatingDb(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

const image = (eventId: string) => ({
  eventId,
  data: new Uint8Array([1, 2, 3]).buffer,
  mimeType: "image/png",
  width: 800,
  height: 600,
});

describe("imageRepository", () => {
  it("stores and reads back an image", async () => {
    const id = await saveImage(db, image("e1"));
    const stored = await getImage(db, id);
    expect(stored).toMatchObject({ eventId: "e1", mimeType: "image/png", width: 800, height: 600 });
    expect(new Uint8Array(stored!.data)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("refuses huge images", async () => {
    await expect(
      saveImage(db, { ...image("e1"), data: new ArrayBuffer(MAX_IMAGE_BYTES + 1) }),
    ).rejects.toThrow(/too large/);
  });

  it("prunes images no layout uses, and deletes them with the event", async () => {
    const doc = createEventDoc({ name: "x" });
    await createEvent(db, doc);
    const used = await saveImage(db, image(doc.id));
    const old = await saveImage(db, image(doc.id));
    expect(await pruneImages(db, doc.id, [used])).toBe(1);
    expect(await getImage(db, old)).toBeNull();
    await deleteEvent(db, doc.id);
    expect(await getImage(db, used)).toBeNull();
  });
});
