import { newId } from "./ids.js";
import {
  type EventDoc,
  MAX_ROOM_OBJECTS,
  MAX_TABLES,
  type RoomObject,
  type Table,
} from "./schema.js";
import type { Point } from "../types/geometry.js";

/**
 * Moving and copying room items (tables and room objects together), for the
 * editor's arrow-key nudge and copy / paste. Like every op, these return new
 * documents.
 */

function clampToFloor(doc: EventDoc, point: Point): Point {
  return {
    x: Math.min(doc.dimensions.width, Math.max(0, point.x)),
    y: Math.min(doc.dimensions.height, Math.max(0, point.y)),
  };
}

/**
 * Moves tables and room objects by `delta`, keeping each centre on the floor.
 * Ids of other kinds (or unknown ids) are ignored; unchanged → same document.
 */
export function moveItems(doc: EventDoc, ids: string[], delta: Point): EventDoc {
  const wanted = new Set(ids);
  let changed = false;
  const move = <T extends { id: string; position: Point }>(item: T): T => {
    if (!wanted.has(item.id)) return item;
    const position = clampToFloor(doc, {
      x: item.position.x + delta.x,
      y: item.position.y + delta.y,
    });
    if (position.x === item.position.x && position.y === item.position.y) return item;
    changed = true;
    return { ...item, position };
  };
  const tables = doc.tables.map(move);
  const objects = doc.objects.map(move);
  return changed ? { ...doc, tables, objects } : doc;
}

/** What Copy keeps: snapshots of tables (without guests) and room objects. */
export interface ClipboardItems {
  tables: Table[];
  objects: RoomObject[];
}

/** Snapshots the given tables and room objects for pasting later (anywhere). */
export function copyItems(doc: EventDoc, ids: string[]): ClipboardItems {
  const wanted = new Set(ids);
  return {
    tables: doc.tables.filter((table) => wanted.has(table.id)),
    objects: doc.objects.filter((object) => wanted.has(object.id)),
  };
}

/**
 * Adds copies of clipboard items (fresh table, seat and object ids; no guests),
 * shifted by `offset` and kept on the floor. Stops at the table / object
 * limits. Returns the new ids (tables first).
 */
export function pasteItems(
  doc: EventDoc,
  items: ClipboardItems,
  offset = 24,
): { doc: EventDoc; ids: string[] } {
  const shifted = (point: Point): Point =>
    clampToFloor(doc, { x: point.x + offset, y: point.y + offset });
  const tables: Table[] = items.tables
    .slice(0, Math.max(0, MAX_TABLES - doc.tables.length))
    .map((table) => ({
      ...table,
      id: newId(),
      position: shifted(table.position),
      seats: table.seats.map((seat) => ({ ...seat, id: newId() })),
    }));
  const objects: RoomObject[] = items.objects
    .slice(0, Math.max(0, MAX_ROOM_OBJECTS - doc.objects.length))
    .map((object) => ({ ...object, id: newId(), position: shifted(object.position) }));
  if (tables.length === 0 && objects.length === 0) return { doc, ids: [] };
  return {
    doc: { ...doc, tables: [...doc.tables, ...tables], objects: [...doc.objects, ...objects] },
    ids: [...tables.map((table) => table.id), ...objects.map((object) => object.id)],
  };
}
