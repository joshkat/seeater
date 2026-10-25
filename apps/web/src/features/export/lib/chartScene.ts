import type {
  EventDoc,
  Guest,
  LayoutView,
  Point,
  RoomObjectKind,
  Size,
  Table,
} from "@seating/shared";
import { CHAIR_RADIUS, resolveSeatPositions } from "@seating/shared";

import {
  type LegendEntry,
  categoryColors,
  chairColor,
  legendFor,
} from "../../editor/lib/chairColors";

/** What colours the printed chairs ("none" = neutral). */
export type ChartColorMode = "none" | "tag" | "meal";

export const CHART_COLOR_MODES: { value: ChartColorMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "tag", label: "Tag" },
  { value: "meal", label: "Meal" },
];

export interface ChartOptions {
  /** First names next to occupied chairs. */
  showNames: boolean;
  color: ChartColorMode;
  /** Leave declined guests' chairs empty (like the printed lists). */
  includeDeclined: boolean;
}

/**
 * The smallest area the chart is printed in, in points: 7 × 8 in fits a
 * letter or A4 page in either orientation with the browser's margins and the
 * title. The chart is scaled to fit this box, so sizing text for it
 * guarantees a minimum printed size (a bigger page only makes it larger).
 */
export const CHART_PRINT_BOX = { width: 7 * 72, height: 8 * 72 };
/** Minimum printed sizes, in points. */
export const TABLE_NAME_MIN_PT = 10;
export const GUEST_NAME_MIN_PT = 7;
/** On-screen canvas sizes (plan units), used when they print bigger anyway. */
const TABLE_NAME_UNITS = 14;
const GUEST_NAME_UNITS = 10;
/** Empty floor around what's drawn. */
const MARGIN = 40;
/** Rough width of a character as a share of the font size (for margins). */
const CHAR_WIDTH = 0.6;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartTable {
  id: string;
  name: string;
  shape: "round" | "rect" | "row";
  center: Point;
  width: number;
  height: number;
  rotation: number;
  /** Where the table's name is written. */
  label: Point;
}

export interface ChartObject {
  id: string;
  kind: RoomObjectKind;
  label: string;
  center: Point;
  width: number;
  height: number;
  rotation: number;
}

export interface ChartChair {
  seatId: string;
  center: Point;
  occupied: boolean;
  /** Category colour (colour mode on), else null = neutral. */
  fill: string | null;
  /** The occupant's first name, when names are shown. */
  name: string | null;
  /** Where the name starts, and the angle it runs at (outward from the table). */
  nameAt: Point;
  nameAngle: number;
  /** The name runs right to left of `nameAt` (keeps text upright). */
  nameFlipped: boolean;
}

export interface ChartScene {
  bounds: Bounds;
  tables: ChartTable[];
  objects: ChartObject[];
  chairs: ChartChair[];
  chairRadius: number;
  /** Font sizes in plan units. */
  tableFont: number;
  nameFont: number;
  legend: LegendEntry[];
}

function rotate(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Plan units per printed point when `bounds` is fitted into the print box. */
export function printScale(bounds: Bounds): number {
  return Math.min(
    CHART_PRINT_BOX.width / Math.max(1, bounds.width),
    CHART_PRINT_BOX.height / Math.max(1, bounds.height),
  );
}

/** A font size in plan units that prints at least `minPt` (and at least `units`). */
export function fontUnitsFor(bounds: Bounds, minPt: number, units: number): number {
  return Math.max(units, minPt / printScale(bounds));
}

function boundsOf(points: Point[], pad: number): Bounds | null {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, width: Math.max(...xs) + pad - x, height: Math.max(...ys) + pad - y };
}

/** The four corners of a rotated w × h box. */
function corners(center: Point, width: number, height: number, rotation: number): Point[] {
  return [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ].map((corner) => add(center, rotate(corner, rotation)));
}

/**
 * Which way a chair's name runs (table-local, before rotation), so that
 * neighbours' names don't overlap: straight out from a round table, square
 * off the side of a rectangle, and "down" (away from the row's name) in a row.
 */
function outwardFrom(shape: Table["shape"], size: Size, offset: Point): Point {
  if (shape === "row" || Math.hypot(offset.x, offset.y) < 1) return { x: 0, y: 1 };
  if (shape === "round") return offset;
  const beyondLongSide = Math.abs(offset.y) >= size.height / 2;
  return beyondLongSide ? { x: 0, y: Math.sign(offset.y) } : { x: Math.sign(offset.x), y: 0 };
}

function firstName(guest: Guest): string {
  return guest.name.trim().split(/\s+/)[0] ?? guest.name;
}

/**
 * Everything the printed seating chart draws for one layout, in plan units:
 * tables with their names, room objects, chairs (occupied or not, coloured by
 * tag or meal if asked) with first names running outward, and the crop.
 * Text sizes are chosen so they print at a readable minimum.
 */
export function chartScene(doc: EventDoc, view: LayoutView, options: ChartOptions): ChartScene {
  const guestBySeat = new Map<string, Guest>();
  for (const guest of doc.guests) {
    if (!options.includeDeclined && guest.rsvpStatus === "declined") continue;
    const seatId = view.seating.get(guest.id);
    if (seatId) guestBySeat.set(seatId, guest);
  }
  const seated = [...guestBySeat.values()];
  const colors = options.color === "none" ? null : categoryColors(seated, options.color);

  const tables: ChartTable[] = [];
  const chairs: ChartChair[] = [];
  view.tables.forEach((table, index) => {
    const center = table.position;
    // A row's chairs sit where a name would go: write it above them.
    const lift = table.shape === "row" ? table.size.height / 2 + 30 : 0;
    tables.push({
      id: table.id,
      name: table.label.trim() || `Table ${index + 1}`,
      shape: table.shape === "round" ? "round" : table.shape === "row" ? "row" : "rect",
      center,
      width: table.size.width,
      height: table.size.height,
      rotation: table.rotation,
      label: add(center, rotate({ x: 0, y: -lift }, table.rotation)),
    });

    const seats = [...table.seats].sort((a, b) => a.index - b.index);
    const offsets = resolveSeatPositions(table);
    seats.forEach((seat, seatIndex) => {
      const offset = offsets[seatIndex] ?? { x: 0, y: 0 };
      const chairCenter = add(center, rotate(offset, table.rotation));
      const outward = rotate(outwardFrom(table.shape, table.size, offset), table.rotation);
      const length = Math.hypot(outward.x, outward.y) || 1;
      const direction = { x: outward.x / length, y: outward.y / length };
      const angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
      const flipped = Math.abs(angle) > 90;
      const guest = guestBySeat.get(seat.id);
      chairs.push({
        seatId: seat.id,
        center: chairCenter,
        occupied: guest !== undefined,
        fill:
          guest && colors && options.color !== "none"
            ? chairColor(guest, options.color, colors)
            : null,
        name: guest && options.showNames ? firstName(guest) : null,
        nameAt: add(chairCenter, {
          x: direction.x * (CHAIR_RADIUS + 3),
          y: direction.y * (CHAIR_RADIUS + 3),
        }),
        nameAngle: flipped ? angle - Math.sign(angle) * 180 : angle,
        nameFlipped: flipped,
      });
    });
  });

  const objects: ChartObject[] = view.objects.map((object) => ({
    id: object.id,
    kind: object.kind,
    label: object.label,
    center: object.position,
    width: object.size.width,
    height: object.size.height,
    rotation: object.rotation,
  }));

  const points = [
    ...tables.flatMap((table) => [
      ...corners(table.center, table.width, table.height, table.rotation),
      table.label,
    ]),
    ...chairs.map((chair) => chair.center),
    ...objects.flatMap((object) =>
      corners(object.center, object.width, object.height, object.rotation),
    ),
  ];
  let bounds = boundsOf(points, MARGIN + CHAIR_RADIUS) ?? {
    x: 0,
    y: 0,
    width: view.dimensions.width,
    height: view.dimensions.height,
  };
  // Room for names around the outside chairs.
  const longest = Math.max(0, ...chairs.map((chair) => chair.name?.length ?? 0));
  if (longest > 0) {
    const reach =
      CHAIR_RADIUS +
      3 +
      longest * CHAR_WIDTH * fontUnitsFor(bounds, GUEST_NAME_MIN_PT, GUEST_NAME_UNITS);
    const extra = Math.max(0, reach - MARGIN);
    bounds = {
      x: bounds.x - extra,
      y: bounds.y - extra,
      width: bounds.width + 2 * extra,
      height: bounds.height + 2 * extra,
    };
  }

  return {
    bounds,
    tables,
    objects,
    chairs,
    chairRadius: CHAIR_RADIUS,
    tableFont: fontUnitsFor(bounds, TABLE_NAME_MIN_PT, TABLE_NAME_UNITS),
    nameFont: fontUnitsFor(bounds, GUEST_NAME_MIN_PT, GUEST_NAME_UNITS),
    legend: options.color === "none" ? [] : legendFor(seated, options.color),
  };
}
