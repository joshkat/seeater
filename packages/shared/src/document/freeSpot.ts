import { CHAIR_GAP, CHAIR_RADIUS, GRID_SIZE } from "../geometry/constants.js";
import type { Point, Size } from "../types/geometry.js";
import type { EventDoc, RoomObject, RoomObjectKind, TableShape } from "./schema.js";
import { tableBounds } from "./tableOps.js";

/** An axis-aligned rectangle in plan units. */
export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** How far chairs stick out past a table's edge (as addTableGrid allows for). */
export const CHAIR_CLEARANCE = CHAIR_RADIUS * 2 + CHAIR_GAP;

/** Space kept between a new item and its neighbours (an aisle). */
export const FREE_SPOT_GAP = 40;

/** Objects that are meant to have tables on top of them (zones, text). */
const OVERLAY_KINDS: ReadonlySet<RoomObjectKind> = new Set(["area", "label"]);

/** A table shape's footprint including its chairs (rows have none outside). */
export function tableFootprint(shape: TableShape, size: Size): Size {
  const clearance = shape === "row" ? 0 : 2 * CHAIR_CLEARANCE;
  return { width: size.width + clearance, height: size.height + clearance };
}

/** A room object's axis-aligned footprint (rotation included). */
export function roomObjectBounds(object: RoomObject): Rect {
  const rad = (object.rotation * Math.PI) / 180;
  const { width, height } = object.size;
  const halfW = (Math.abs(Math.cos(rad)) * width + Math.abs(Math.sin(rad)) * height) / 2;
  const halfH = (Math.abs(Math.sin(rad)) * width + Math.abs(Math.cos(rad)) * height) / 2;
  return {
    minX: object.position.x - halfW,
    minY: object.position.y - halfH,
    maxX: object.position.x + halfW,
    maxY: object.position.y + halfH,
  };
}

/** Everything already on the active layout's floor: tables with their chairs,
 * and room objects (except areas and labels, which tables go on). */
export function occupiedRects(doc: EventDoc): Rect[] {
  const tables = doc.tables.map((table) => {
    const bounds = tableBounds(table);
    const pad = table.shape === "row" ? 0 : CHAIR_CLEARANCE;
    return {
      minX: bounds.minX - pad,
      minY: bounds.minY - pad,
      maxX: bounds.maxX + pad,
      maxY: bounds.maxY + pad,
    };
  });
  const objects = doc.objects
    .filter((object) => !OVERLAY_KINDS.has(object.kind))
    .map(roomObjectBounds);
  return [...tables, ...objects];
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.minX < b.maxX + gap && a.maxX + gap > b.minX && a.minY < b.maxY + gap && a.maxY + gap > b.minY
  );
}

/** Whether a footprint centred at `center` touches anything in `occupied`. */
export function isSpotFree(
  occupied: Rect[],
  center: Point,
  footprint: Size,
  gap = FREE_SPOT_GAP,
): boolean {
  const rect = rectAround(center, footprint);
  return occupied.every((other) => !overlaps(rect, other, gap));
}

function rectAround(center: Point, size: Size): Rect {
  return {
    minX: center.x - size.width / 2,
    minY: center.y - size.height / 2,
    maxX: center.x + size.width / 2,
    maxY: center.y + size.height / 2,
  };
}

function intersect(a: Rect, b: Rect): Rect | null {
  const rect = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
  };
  return rect.minX < rect.maxX && rect.minY < rect.maxY ? rect : null;
}

function scan(occupied: Rect[], area: Rect, footprint: Size, gap: number): Point | null {
  const halfW = footprint.width / 2;
  const halfH = footprint.height / 2;
  // Centres on the snapping grid, so new items line up with dragged ones.
  const startX = Math.ceil((area.minX + halfW) / GRID_SIZE) * GRID_SIZE;
  const startY = Math.ceil((area.minY + halfH) / GRID_SIZE) * GRID_SIZE;
  for (let y = startY; y + halfH <= area.maxY; y += GRID_SIZE) {
    for (let x = startX; x + halfW <= area.maxX; x += GRID_SIZE) {
      if (isSpotFree(occupied, { x, y }, footprint, gap)) return { x, y };
    }
  }
  return null;
}

/**
 * The first free spot for a new item of `footprint` (its full size, chairs
 * included): scanning rows from the top-left of `visible` (the part of the
 * floor on screen), then of the whole floor. Keeps a FREE_SPOT_GAP aisle to
 * everything already there. Null when nothing fits anywhere.
 */
export function findFreeSpot(
  doc: EventDoc,
  footprint: Size,
  visible?: Rect | null,
  gap = FREE_SPOT_GAP,
): Point | null {
  const floor: Rect = { minX: 0, minY: 0, maxX: doc.dimensions.width, maxY: doc.dimensions.height };
  const occupied = occupiedRects(doc);
  const onScreen = visible ? intersect(visible, floor) : null;
  return (
    (onScreen && scan(occupied, onScreen, footprint, gap)) ?? scan(occupied, floor, footprint, gap)
  );
}
