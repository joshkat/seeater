import { addTable, createEventDoc, updateTableTransform } from "@seating/shared";
import { describe, expect, it } from "vitest";

import { PREVIEW_CHAIR_RADIUS, previewLayout } from "../lib/previewGeometry";

function table(seatCount: number, rotation = 0, shape: "round" | "rectangle" = "round") {
  const added = addTable(createEventDoc({ name: "T" }), {
    shape,
    position: { x: 0, y: 0 },
    seatCount,
  });
  return updateTableTransform(added.doc, added.tableId, { rotation }).tables[0];
}

describe("previewLayout", () => {
  it("has one chair per seat, numbered in order", () => {
    const layout = previewLayout(table(8));
    expect(layout.chairs.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("spreads crowded chairs so they never overlap", () => {
    const { chairs } = previewLayout(table(40));
    let min = Infinity;
    for (let i = 0; i < chairs.length; i += 1)
      for (let j = i + 1; j < chairs.length; j += 1)
        min = Math.min(min, Math.hypot(chairs[i].x - chairs[j].x, chairs[i].y - chairs[j].y));
    expect(min).toBeGreaterThanOrEqual(PREVIEW_CHAIR_RADIUS * 2.3 - 0.001);
  });

  it("applies the table's rotation to chair positions", () => {
    const flat = previewLayout(table(4, 0, "rectangle")).chairs[0];
    const turned = previewLayout(table(4, 90, "rectangle")).chairs[0];
    expect(turned.x).toBeCloseTo(-flat.y);
    expect(turned.y).toBeCloseTo(flat.x);
  });

  it("puts labels outside the chairs", () => {
    for (const chair of previewLayout(table(6)).chairs) {
      expect(Math.hypot(chair.labelX, chair.labelY)).toBeGreaterThan(Math.hypot(chair.x, chair.y));
    }
  });
});
