import {
  type LayoutView,
  type Table,
  addGuests,
  addTable,
  assignSeat,
  createEventDoc,
  layoutViews,
  updateGuest,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import {
  GUEST_NAME_MIN_PT,
  TABLE_NAME_MIN_PT,
  chartScene,
  fontUnitsFor,
  printScale,
} from "../lib/chartScene";
import { defaultPrintLayoutId } from "../lib/printLayout";

function view(id: string, active: boolean, shapes: Table["shape"][]): LayoutView {
  return {
    id,
    name: id,
    active,
    dimensions: { width: 1600, height: 1000 },
    tables: shapes.map((shape, index) => ({ shape, id: `${id}-${index}` }) as Table),
    objects: [],
    backdrop: null,
    seating: new Map(),
  };
}

describe("defaultPrintLayoutId", () => {
  const ceremony = view("ceremony", true, ["row", "row", "row", "row", "row"]);
  const reception = view("reception", false, ["round", "round", "rectangle"]);

  it("puts the chart and rosters on the active layout", () => {
    expect(defaultPrintLayoutId("chart", [ceremony, reception])).toBe("ceremony");
    expect(defaultPrintLayoutId("rosters", [ceremony, reception])).toBe("ceremony");
  });

  it("puts cards and the find-your-seat board on the layout with the most tables (not rows)", () => {
    for (const kind of ["escort-cards", "place-cards", "find-your-seat"] as const) {
      expect(defaultPrintLayoutId(kind, [ceremony, reception])).toBe("reception");
    }
  });

  it("keeps the active layout on a tie", () => {
    const other = view("other", false, ["round"]);
    const active = view("main", true, ["round"]);
    expect(defaultPrintLayoutId("escort-cards", [other, active])).toBe("main");
    expect(defaultPrintLayoutId("escort-cards", [])).toBeNull();
  });
});

function seatedDoc() {
  let doc = createEventDoc({ name: "Dinner" });
  doc = addTable(doc, { shape: "round", position: { x: 400, y: 300 }, seatCount: 4 }).doc;
  doc = addTable(doc, { shape: "round", position: { x: 900, y: 300 }, seatCount: 4 }).doc;
  const added = addGuests(doc, [
    { name: "Ada Lovelace", meal: "Fish" },
    { name: "Grace Hopper", meal: "Chicken" },
    { name: "Zed Declined", meal: "Fish" },
  ]);
  const [ada, grace, zed] = added.guestIds;
  doc = assignSeat(added.doc, ada, doc.tables[0].seats[0].id);
  doc = assignSeat(doc, grace, doc.tables[0].seats[1].id);
  doc = updateGuest(doc, zed, { rsvpStatus: "declined" });
  doc = assignSeat(doc, zed, doc.tables[1].seats[0].id);
  return doc;
}

describe("chartScene", () => {
  const doc = seatedDoc();
  const active = layoutViews(doc)[0];
  const plain = { showNames: false, color: "none" as const, includeDeclined: false };

  it("draws neutral chairs and no names by default, leaving declined guests out", () => {
    const scene = chartScene(doc, active, plain);
    expect(scene.tables.map((table) => table.name)).toEqual(["Table 1", "Table 2"]);
    expect(scene.chairs).toHaveLength(8);
    expect(scene.chairs.filter((chair) => chair.occupied)).toHaveLength(2);
    expect(scene.chairs.every((chair) => chair.fill === null && chair.name === null)).toBe(true);
    expect(scene.legend).toEqual([]);
  });

  it("shows first names and colours by meal with a legend when asked", () => {
    const scene = chartScene(doc, active, { ...plain, showNames: true, color: "meal" });
    expect(scene.chairs.flatMap((chair) => (chair.name ? [chair.name] : []))).toEqual([
      "Ada",
      "Grace",
    ]);
    expect(scene.legend.map((entry) => entry.label)).toEqual(["Chicken", "Fish"]);
    const fills = scene.chairs.filter((chair) => chair.occupied).map((chair) => chair.fill);
    expect(new Set(fills).size).toBe(2);
  });

  it("includes declined guests only when asked", () => {
    const scene = chartScene(doc, active, { ...plain, includeDeclined: true });
    expect(scene.chairs.filter((chair) => chair.occupied)).toHaveLength(3);
  });

  it("crops to what's drawn and sizes text to print at a readable minimum", () => {
    const scene = chartScene(doc, active, { ...plain, showNames: true });
    expect(scene.bounds.width).toBeLessThan(1600);
    const scale = printScale(scene.bounds);
    expect(scene.tableFont * scale).toBeGreaterThanOrEqual(TABLE_NAME_MIN_PT - 1e-9);
    expect(scene.nameFont * scale).toBeGreaterThanOrEqual(GUEST_NAME_MIN_PT - 1e-9);
  });

  it("never prints text smaller than the minimum, even for a huge room", () => {
    const bounds = { x: 0, y: 0, width: 6000, height: 4000 };
    expect(fontUnitsFor(bounds, 10, 14) * printScale(bounds)).toBeCloseTo(10);
    // A small room prints the canvas size, which is already bigger.
    const small = { x: 0, y: 0, width: 200, height: 100 };
    expect(fontUnitsFor(small, 10, 14)).toBe(14);
  });

  it("runs names square off a rectangle's long sides", () => {
    let banquet = createEventDoc({ name: "Banquet" });
    banquet = addTable(banquet, {
      shape: "rectangle",
      position: { x: 400, y: 300 },
      size: { width: 240, height: 80 },
      seatCount: 6,
    }).doc;
    const scene = chartScene(banquet, layoutViews(banquet)[0], plain);
    const sideChairs = scene.chairs.filter((chair) => Math.abs(chair.center.y - 300) > 40);
    expect(sideChairs.length).toBeGreaterThan(0);
    for (const chair of sideChairs) expect(Math.abs(chair.nameAngle)).toBeCloseTo(90);
  });

  it("keeps names upright: left-pointing names are flipped", () => {
    const scene = chartScene(doc, active, { ...plain, showNames: true });
    for (const chair of scene.chairs) {
      expect(Math.abs(chair.nameAngle)).toBeLessThanOrEqual(90 + 1e-9);
    }
  });
});
