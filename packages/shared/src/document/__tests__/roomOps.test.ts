import { describe, expect, it } from "vitest";

import { TABLE_PRESETS } from "../../geometry/constants.js";
import { resolveSeatPositions } from "../../geometry/seatLayout.js";
import { createEventDoc, setFloorSize, setUnitSystem } from "../eventOps.js";
import { eventDocSchema } from "../schema.js";
import {
  addTable,
  addTableFromPreset,
  addTableGrid,
  alignTables,
  distributeTables,
  setSeatCount,
  tableBounds,
  updateTableTransform,
} from "../tableOps.js";

const preset = (id: string) => TABLE_PRESETS.find((p) => p.id === id)!;
const at = { x: 500, y: 400 };

describe("table presets", () => {
  it("adds a banquet table with chairs on both long sides only", () => {
    const { doc, tableId } = addTableFromPreset(
      createEventDoc({ name: "x" }),
      preset("banquet-8"),
      at,
    );
    const table = doc.tables.find((t) => t.id === tableId)!;
    expect(table).toMatchObject({
      shape: "rectangle",
      size: { width: 244, height: 76 },
      chairLayoutMode: "custom",
    });
    const ys = resolveSeatPositions(table).map((p) => Math.sign(p.y));
    expect(ys.filter((y) => y < 0)).toHaveLength(4);
    expect(ys.filter((y) => y > 0)).toHaveLength(4);
    expect(eventDocSchema.safeParse(doc).success).toBe(true);
  });

  it("adds a head table with everyone on one side", () => {
    const { doc } = addTableFromPreset(createEventDoc({ name: "x" }), preset("head-8"), at);
    expect(resolveSeatPositions(doc.tables[0]).every((p) => p.y < 0)).toBe(true);
  });

  it("adds a row of chairs that grows with its chair count", () => {
    const { doc, tableId } = addTableFromPreset(
      createEventDoc({ name: "x" }),
      preset("row-10"),
      at,
    );
    expect(resolveSeatPositions(doc.tables[0]).every((p) => p.y === 0)).toBe(true);
    const longer = setSeatCount(doc, tableId, 14);
    expect(longer.tables[0].size.width).toBe(14 * 55);
    expect(eventDocSchema.safeParse(longer).success).toBe(true);
  });
});

describe("align and distribute", () => {
  function three() {
    let doc = createEventDoc({ name: "x" });
    const ids: string[] = [];
    for (const position of [
      { x: 100, y: 100 },
      { x: 400, y: 160 },
      { x: 1000, y: 130 },
    ]) {
      const added = addTable(doc, { shape: "round", position });
      doc = added.doc;
      ids.push(added.tableId);
    }
    return { doc, ids };
  }

  it("aligns tops and centres", () => {
    const { doc, ids } = three();
    const top = alignTables(doc, ids, "top");
    expect(new Set(top.tables.map((t) => tableBounds(t).minY)).size).toBe(1);
    const middle = alignTables(doc, ids, "middle");
    expect(middle.tables.map((t) => t.position.y)).toEqual([130, 130, 130]);
    expect(alignTables(doc, [ids[0]], "left")).toBe(doc);
  });

  it("aligns using rotated footprints", () => {
    let { doc, ids } = three();
    doc = addTable(doc, {
      shape: "rectangle",
      position: { x: 700, y: 500 },
      size: { width: 200, height: 60 },
    }).doc;
    const rect = doc.tables.at(-1)!;
    doc = updateTableTransform(doc, rect.id, { rotation: 90 });
    const left = alignTables(doc, [ids[0], rect.id], "left");
    const rotated = left.tables.find((t) => t.id === rect.id)!;
    expect(tableBounds(rotated).minX).toBeCloseTo(tableBounds(left.tables[0]).minX);
  });

  it("distributes with equal gaps between the outermost tables", () => {
    const { doc, ids } = three();
    const spread = distributeTables(doc, ids, "horizontal");
    const xs = spread.tables.map((t) => t.position.x);
    expect(xs[0]).toBe(100);
    expect(xs[2]).toBe(1000);
    expect(xs[1]).toBeCloseTo(550);
    expect(distributeTables(doc, ids.slice(0, 2), "horizontal")).toBe(doc);
  });
});

describe("table grid", () => {
  it("adds a centred grid of tables in one edit", () => {
    const { doc, tableIds } = addTableGrid(createEventDoc({ name: "x" }), {
      count: 7,
      columns: 3,
      preset: preset("round-60"),
      center: { x: 800, y: 500 },
    });
    expect(tableIds).toHaveLength(7);
    expect(doc.tables.every((t) => t.seats.length === 8 && t.size.width === 152)).toBe(true);
    const xs = [...new Set(doc.tables.map((t) => Math.round(t.position.x)))];
    const ys = [...new Set(doc.tables.map((t) => Math.round(t.position.y)))];
    expect(xs).toHaveLength(3);
    expect(ys).toHaveLength(3);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(800);
    expect(eventDocSchema.safeParse(doc).success).toBe(true);
  });
});

describe("event units and floor", () => {
  it("sets units and resizes the floor (with a minimum)", () => {
    const doc = createEventDoc({ name: "x" });
    expect(doc.settings.units).toBe("auto");
    expect(setUnitSystem(doc, "imperial").settings.units).toBe("imperial");
    expect(setUnitSystem(doc, "auto")).toBe(doc);
    expect(setFloorSize(doc, { width: 2000.4, height: 50 }).dimensions).toEqual({
      width: 2000,
      height: 200,
    });
  });
});
