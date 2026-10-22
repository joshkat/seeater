import { describe, expect, it } from "vitest";

import { copyItems, moveItems, pasteItems } from "../clipboardOps.js";
import { assignSeat } from "../guestOps.js";
import { addRoomObject } from "../roomObjectOps.js";
import { eventDocSchema } from "../schema.js";
import { addTable } from "../tableOps.js";
import { fixture, seatIdsOf } from "./fixture.js";

function withObject() {
  const { doc, tableId, guestIds } = fixture();
  const added = addRoomObject(doc, "bar", { x: 100, y: 100 });
  return { doc: added.doc, tableId, objectId: added.objectId!, guestIds };
}

describe("moveItems", () => {
  it("moves tables and room objects together", () => {
    const { doc, tableId, objectId } = withObject();
    const moved = moveItems(doc, [tableId, objectId], { x: 10, y: -5 });
    expect(moved.tables[0].position).toEqual({ x: 410, y: 295 });
    expect(moved.objects[0].position).toEqual({ x: 110, y: 95 });
  });

  it("keeps centres on the floor and returns the same doc when nothing moves", () => {
    const { doc, objectId } = withObject();
    const moved = moveItems(doc, [objectId], { x: -500, y: -500 });
    expect(moved.objects[0].position).toEqual({ x: 0, y: 0 });
    expect(moveItems(moved, [objectId], { x: -10, y: 0 })).toBe(moved);
    expect(moveItems(doc, ["nope"], { x: 10, y: 0 })).toBe(doc);
  });
});

describe("copyItems / pasteItems", () => {
  it("pastes copies with fresh ids and no guests, offset and selected", () => {
    const { doc, tableId, objectId, guestIds } = withObject();
    const seated = assignSeat(doc, guestIds[0], seatIdsOf(doc, tableId)[0]);
    const clipboard = copyItems(seated, [tableId, objectId]);
    const pasted = pasteItems(seated, clipboard);

    expect(pasted.ids).toHaveLength(2);
    expect(pasted.doc.tables).toHaveLength(2);
    const copy = pasted.doc.tables[1];
    expect(copy.id).toBe(pasted.ids[0]);
    expect(copy.position).toEqual({ x: 424, y: 324 });
    expect(copy.seats.map((s) => s.id)).not.toEqual(seatIdsOf(seated, tableId));
    expect(pasted.doc.objects[1]).toMatchObject({ id: pasted.ids[1], kind: "bar" });
    // Only the original seat is taken.
    expect(pasted.doc.guests.filter((g) => g.seatId)).toHaveLength(1);
    expect(eventDocSchema.safeParse(pasted.doc).success).toBe(true);
  });

  it("pastes into another document (e.g. another layout or event)", () => {
    const { doc, tableId } = withObject();
    const clipboard = copyItems(doc, [tableId]);
    const other = addTable(fixture().doc, { shape: "rectangle", position: { x: 0, y: 0 } }).doc;
    const pasted = pasteItems(other, clipboard, 0);
    expect(pasted.doc.tables).toHaveLength(3);
    expect(eventDocSchema.safeParse(pasted.doc).success).toBe(true);
  });

  it("does nothing with an empty clipboard", () => {
    const { doc } = withObject();
    expect(pasteItems(doc, { tables: [], objects: [] })).toEqual({ doc, ids: [] });
  });
});
