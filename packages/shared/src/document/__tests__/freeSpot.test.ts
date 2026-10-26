import { describe, expect, it } from "vitest";

import { createEventDoc } from "../eventOps.js";
import {
  CHAIR_CLEARANCE,
  findFreeSpot,
  isSpotFree,
  occupiedRects,
  tableFootprint,
} from "../freeSpot.js";
import { addRoomObject } from "../roomObjectOps.js";
import { addTable, addTableGrid, gridFootprint } from "../tableOps.js";

const empty = () =>
  createEventDoc({ name: "Room", dimensions: { width: 1000, height: 600 }, now: "2026-01-01" });

const ROUND = tableFootprint("round", { width: 120, height: 120 });

describe("findFreeSpot", () => {
  it("starts at the top-left of an empty floor", () => {
    const spot = findFreeSpot(empty(), ROUND)!;
    expect(spot.x - ROUND.width / 2).toBeGreaterThanOrEqual(0);
    expect(spot.x).toBeLessThan(ROUND.width);
    expect(spot.y).toBeLessThan(ROUND.height);
  });

  it("never overlaps a table or its chairs", () => {
    let doc = empty();
    for (let i = 0; i < 6; i += 1) {
      const spot = findFreeSpot(doc, ROUND)!;
      expect(spot).not.toBeNull();
      expect(isSpotFree(occupiedRects(doc), spot, ROUND)).toBe(true);
      doc = addTable(doc, { shape: "round", position: spot }).doc;
    }
    // Six tables, all apart.
    const rects = occupiedRects(doc);
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY;
        expect(apart).toBe(true);
      }
    }
  });

  it("prefers the visible part of the floor", () => {
    const visible = { minX: 500, minY: 300, maxX: 1000, maxY: 600 };
    const spot = findFreeSpot(empty(), ROUND, visible)!;
    expect(spot.x - ROUND.width / 2).toBeGreaterThanOrEqual(500);
    expect(spot.y - ROUND.height / 2).toBeGreaterThanOrEqual(300);
  });

  it("falls back to the whole floor when the visible part is full", () => {
    const doc = addRoomObject(empty(), "dance-floor", { x: 750, y: 450 }).doc;
    const visible = { minX: 500, minY: 300, maxX: 1000, maxY: 600 };
    const spot = findFreeSpot(doc, ROUND, visible)!;
    expect(spot.y).toBeLessThan(300);
  });

  it("avoids room objects but not areas or labels", () => {
    const bar = addRoomObject(empty(), "bar", { x: 150, y: 40 }).doc;
    expect(occupiedRects(bar)).toHaveLength(1);
    const area = addRoomObject(empty(), "area", { x: 200, y: 150 }).doc;
    expect(occupiedRects(area)).toHaveLength(0);
  });

  it("counts chairs around tables but not rows", () => {
    const doc = addTable(empty(), { shape: "round", position: { x: 500, y: 300 } }).doc;
    const [rect] = occupiedRects(doc);
    expect(rect.maxX - rect.minX).toBe(120 + 2 * CHAIR_CLEARANCE);
    expect(tableFootprint("row", { width: 300, height: 50 })).toEqual({ width: 300, height: 50 });
  });

  it("returns null when nothing fits", () => {
    expect(findFreeSpot(empty(), { width: 2000, height: 100 })).toBeNull();
  });
});

describe("gridFootprint", () => {
  it("matches the tables addTableGrid lays out", () => {
    const options = { count: 6, columns: 3, shape: "round" as const };
    const size = gridFootprint(options);
    const { doc } = addTableGrid(empty(), { ...options, center: { x: 500, y: 300 } });
    const rects = occupiedRects(doc);
    const minX = Math.min(...rects.map((r) => r.minX));
    const maxX = Math.max(...rects.map((r) => r.maxX));
    const minY = Math.min(...rects.map((r) => r.minY));
    const maxY = Math.max(...rects.map((r) => r.maxY));
    expect(maxX - minX).toBeCloseTo(size.width);
    expect(maxY - minY).toBeCloseTo(size.height);
  });
});
