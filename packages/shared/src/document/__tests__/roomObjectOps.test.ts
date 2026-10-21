import { describe, expect, it } from "vitest";

import { createEventDoc, duplicateEventDoc } from "../eventOps.js";
import { addLayout, layoutViews, switchLayout } from "../layoutOps.js";
import {
  addRoomObject,
  backdropImageIds,
  clearBackdrop,
  deleteRoomObjects,
  duplicateRoomObjects,
  setBackdrop,
  setBackdropOpacity,
  updateRoomObject,
} from "../roomObjectOps.js";
import { eventDocSchema } from "../schema.js";

const valid = (doc: unknown) => expect(eventDocSchema.safeParse(doc).success).toBe(true);
const at = { x: 400, y: 300 };

describe("room objects", () => {
  it("adds with defaults, updates, duplicates and deletes", () => {
    const { doc, objectId } = addRoomObject(createEventDoc({ name: "x" }), "dance-floor", at);
    expect(doc.objects[0]).toMatchObject({
      kind: "dance-floor",
      label: "Dance floor",
      size: { width: 500, height: 500 },
    });
    valid(doc);

    const moved = updateRoomObject(doc, objectId!, {
      label: "Floor",
      size: { width: 2, height: 600 },
      rotation: 45,
    });
    expect(moved.objects[0]).toMatchObject({
      label: "Floor",
      size: { width: 5, height: 600 },
      rotation: 45,
    });

    const copy = duplicateRoomObjects(moved, [objectId!]);
    expect(copy.doc.objects).toHaveLength(2);
    expect(copy.doc.objects[1].position).toEqual({ x: 424, y: 324 });
    valid(copy.doc);

    expect(deleteRoomObjects(copy.doc, [objectId!]).objects.map((o) => o.id)).toEqual(
      copy.objectIds,
    );
    expect(deleteRoomObjects(doc, ["nope"])).toBe(doc);
  });

  it("belongs to a layout: kept per layout and copied with 'copy tables'", () => {
    const base = addRoomObject(createEventDoc({ name: "x" }), "stage", at).doc;
    const main = base.activeLayoutId;
    const blank = addLayout(base, "Ceremony").doc;
    expect(blank.objects).toEqual([]);
    expect(switchLayout(blank, main).objects).toHaveLength(1);

    const copied = addLayout(base, "Copy", "tables").doc;
    expect(copied.objects).toHaveLength(1);
    expect(copied.objects[0].id).not.toBe(base.objects[0].id);
    valid(copied);
    expect(layoutViews(copied).map((view) => view.objects.length)).toEqual([1, 1]);
  });

  it("gets fresh ids when the event is duplicated", () => {
    const base = addRoomObject(createEventDoc({ name: "x" }), "bar", at).doc;
    const copy = duplicateEventDoc(addLayout(base, "Two", "tables").doc);
    valid(copy);
    expect(copy.objects[0].id).not.toBe(base.objects[0].id);
  });

  it("rejects duplicate object ids across layouts", () => {
    const base = addRoomObject(createEventDoc({ name: "x" }), "bar", at).doc;
    const two = addLayout(base, "Two", "tables").doc;
    const stored = two.layouts[0].stored!;
    const broken = {
      ...two,
      layouts: [{ ...two.layouts[0], stored: { ...stored, objects: two.objects } }, two.layouts[1]],
    };
    expect(eventDocSchema.safeParse(broken).success).toBe(false);
  });
});

describe("floor-plan image", () => {
  it("sets, adjusts and clears the active layout's image", () => {
    const doc = setBackdrop(createEventDoc({ name: "x" }), "img-1", 2);
    expect(doc.backdrop).toEqual({ imageId: "img-1", opacity: 1 });
    expect(setBackdropOpacity(doc, 0.3).backdrop?.opacity).toBe(0.3);
    expect(clearBackdrop(doc).backdrop).toBeNull();
    valid(doc);
  });

  it("lists the images every layout uses", () => {
    const withImage = setBackdrop(createEventDoc({ name: "x" }), "img-1");
    const two = setBackdrop(addLayout(withImage, "Two").doc, "img-2");
    expect(backdropImageIds(two).sort()).toEqual(["img-1", "img-2"]);
  });
});
