import { describe, expect, it } from "vitest";

import { assignSeat } from "../guestOps.js";
import { eventDocSchema } from "../schema.js";
import {
  addTable,
  deleteTables,
  duplicateTables,
  resizeTableKeepingChairs,
  setChairMode,
  setSeatCount,
  setSeatOffset,
  updateTableTransform,
} from "../tableOps.js";
import { fixture, seatIdsOf, seatOf } from "./fixture.js";

/** Fixture with Ada in seat 0 and Grace in seat 3. */
function seated() {
  const { doc, tableId, guestIds } = fixture();
  const seats = seatIdsOf(doc, tableId);
  const withAda = assignSeat(doc, guestIds[0], seats[0]);
  return { doc: assignSeat(withAda, guestIds[1], seats[3]), tableId, guestIds, seats };
}

describe("addTable", () => {
  it("creates indexed seats and keeps the doc valid", () => {
    const { doc, tableId } = addTable(fixture().doc, {
      shape: "rectangle",
      position: { x: 10, y: 10 },
      seatCount: 6,
      chairLayoutMode: "custom",
    });
    const table = doc.tables.find((t) => t.id === tableId)!;
    expect(table.seats.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(table.seats.every((s) => s.offset !== null)).toBe(true);
    expect(eventDocSchema.safeParse(doc).success).toBe(true);
  });

  it("clamps the seat count", () => {
    const { doc, tableId } = addTable(fixture().doc, {
      shape: "round",
      position: { x: 0, y: 0 },
      seatCount: 500,
    });
    expect(doc.tables.find((t) => t.id === tableId)!.seats).toHaveLength(64);
  });
});

describe("setSeatCount", () => {
  it("keeps surviving seat ids so seated guests stay put", () => {
    const { doc, tableId, guestIds, seats } = seated();
    const grown = setSeatCount(doc, tableId, 8);
    expect(seatIdsOf(grown, tableId).slice(0, 4)).toEqual(seats);
    expect(seatOf(grown, guestIds[0])).toBe(seats[0]);
  });

  it("unseats guests whose seat was removed", () => {
    const { doc, tableId, guestIds, seats } = seated();
    const shrunk = setSeatCount(doc, tableId, 2);
    expect(seatOf(shrunk, guestIds[0])).toBe(seats[0]);
    expect(seatOf(shrunk, guestIds[1])).toBeNull();
    expect(eventDocSchema.safeParse(shrunk).success).toBe(true);
  });
});

describe("setChairMode / setSeatOffset", () => {
  it("preserves seat ids across auto <-> custom", () => {
    const { doc, tableId, seats } = seated();
    const custom = setChairMode(doc, tableId, "custom");
    expect(seatIdsOf(custom, tableId)).toEqual(seats);
    expect(custom.tables[0].seats.every((s) => s.offset !== null)).toBe(true);
    const auto = setChairMode(custom, tableId, "auto");
    expect(seatIdsOf(auto, tableId)).toEqual(seats);
    expect(auto.tables[0].seats.every((s) => s.offset === null)).toBe(true);
  });

  it("moving a chair switches the table to custom and moves only that chair", () => {
    const { doc, tableId } = seated();
    const moved = setSeatOffset(doc, tableId, 2, { x: 1, y: 2 });
    const table = moved.tables[0];
    expect(table.chairLayoutMode).toBe("custom");
    expect(table.seats[2].offset).toEqual({ x: 1, y: 2 });
    expect(table.seats[1].offset).not.toEqual({ x: 1, y: 2 });
  });
});

describe("updateTableTransform", () => {
  it("does not touch seats", () => {
    const { doc, tableId, seats } = seated();
    const moved = updateTableTransform(doc, tableId, { position: { x: 1, y: 1 }, rotation: 90 });
    expect(moved.tables[0].position).toEqual({ x: 1, y: 1 });
    expect(seatIdsOf(moved, tableId)).toEqual(seats);
  });
});

describe("resizeTableKeepingChairs", () => {
  it("resizes a round and keeps its seats (and guests)", () => {
    const { doc, tableId, seats, guestIds } = seated();
    const next = resizeTableKeepingChairs(doc, tableId, { width: 183, height: 100 });
    expect(next.tables[0].size).toEqual({ width: 183, height: 183 });
    expect(seatIdsOf(next, tableId)).toEqual(seats);
    expect(seatOf(next, guestIds[0])).toBe(seats[0]);
  });

  it("moves custom chairs out with the edges", () => {
    const base = addTable(fixture().doc, {
      shape: "rectangle",
      size: { width: 200, height: 80 },
      seatCount: 4,
      chairs: "long-sides",
      position: { x: 500, y: 500 },
    });
    const before = base.doc.tables.find((table) => table.id === base.tableId)!;
    const next = resizeTableKeepingChairs(base.doc, base.tableId, { width: 400, height: 80 });
    const after = next.tables.find((table) => table.id === base.tableId)!;
    for (const [index, seat] of after.seats.entries()) {
      const was = before.seats[index].offset!;
      // Along the long side: spread out proportionally. Past the edge: same gap.
      expect(seat.offset!.x).toBeCloseTo(was.x * 2);
      expect(seat.offset!.y).toBeCloseTo(was.y);
    }
  });
});

describe("duplicateTables / deleteTables", () => {
  it("duplicates with fresh table and seat ids and no guests", () => {
    const { doc, tableId, seats } = seated();
    const result = duplicateTables(doc, [tableId]);
    expect(result.tableIds).toHaveLength(1);
    const copySeats = seatIdsOf(result.doc, result.tableIds[0]);
    expect(copySeats.some((id) => seats.includes(id))).toBe(false);
    expect(result.doc.guests.filter((g) => g.seatId && copySeats.includes(g.seatId))).toEqual([]);
    expect(eventDocSchema.safeParse(result.doc).success).toBe(true);
  });

  it("deleting a table returns its guests to unassigned", () => {
    const { doc, tableId } = seated();
    const after = deleteTables(doc, [tableId]);
    expect(after.tables).toHaveLength(0);
    expect(after.guests.every((g) => g.seatId === null)).toBe(true);
    expect(eventDocSchema.safeParse(after).success).toBe(true);
  });
});
