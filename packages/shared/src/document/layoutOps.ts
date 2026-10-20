import type { Size } from "../types/geometry.js";
import { newId } from "./ids.js";
import {
  type EventDoc,
  MAX_LAYOUT_NAME_LENGTH,
  MAX_LAYOUTS,
  type StoredLayout,
  type Table,
} from "./schema.js";

/**
 * Layouts: one event, several floor plans (ceremony, reception…) sharing the
 * guest list. The active layout is the document's top-level dimensions,
 * tables and guests' seatIds, so every other op edits it unchanged; the
 * others are kept in `layout.stored`. Switching swaps them.
 */

/** How a new layout starts. */
export type NewLayoutContent = "blank" | "tables" | "tables-and-seating";

function cleanLayoutName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_LAYOUT_NAME_LENGTH);
}

/** The active layout's content, packed for storage. */
function packActive(doc: EventDoc): StoredLayout {
  const seating: Record<string, string> = {};
  for (const guest of doc.guests) if (guest.seatId) seating[guest.id] = guest.seatId;
  return { dimensions: doc.dimensions, tables: doc.tables, seating };
}

/** Makes `stored` the active content (top-level fields) of a document. */
function unpack(
  doc: EventDoc,
  stored: StoredLayout,
): Pick<EventDoc, "dimensions" | "tables" | "guests"> {
  return {
    dimensions: stored.dimensions,
    tables: stored.tables,
    guests: doc.guests.map((guest) => {
      const seatId = stored.seating[guest.id] ?? null;
      return guest.seatId === seatId ? guest : { ...guest, seatId };
    }),
  };
}

/** Switches the active layout. Unknown ids (or the active one) are a no-op. */
export function switchLayout(doc: EventDoc, layoutId: string): EventDoc {
  if (layoutId === doc.activeLayoutId) return doc;
  const target = doc.layouts.find((layout) => layout.id === layoutId);
  if (!target?.stored) return doc;
  const packed = packActive(doc);
  return {
    ...doc,
    ...unpack(doc, target.stored),
    activeLayoutId: layoutId,
    layouts: doc.layouts.map((layout) => {
      if (layout.id === doc.activeLayoutId) return { ...layout, stored: packed };
      if (layout.id === layoutId) return { ...layout, stored: null };
      return layout;
    }),
  };
}

/** Copies tables with fresh table and seat ids; returns the seat id map too. */
function cloneTables(tables: Table[]): { tables: Table[]; seatIdMap: Map<string, string> } {
  const seatIdMap = new Map<string, string>();
  const cloned = tables.map((table) => ({
    ...table,
    id: newId(),
    seats: table.seats.map((seat) => {
      const id = newId();
      seatIdMap.set(seat.id, id);
      return { ...seat, id };
    }),
  }));
  return { tables: cloned, seatIdMap };
}

/**
 * Adds a layout and makes it active. It starts blank, with a copy of the
 * current layout's tables, or with its tables and seating. At MAX_LAYOUTS the
 * document is unchanged (layoutId null).
 */
export function addLayout(
  doc: EventDoc,
  name: string,
  content: NewLayoutContent = "blank",
): { doc: EventDoc; layoutId: string | null } {
  if (doc.layouts.length >= MAX_LAYOUTS) return { doc, layoutId: null };
  const layoutId = newId();
  const layoutName = cleanLayoutName(name) || `Layout ${doc.layouts.length + 1}`;

  let next: StoredLayout = { dimensions: doc.dimensions, tables: [], seating: {} };
  if (content !== "blank") {
    const { tables, seatIdMap } = cloneTables(doc.tables);
    const seating: Record<string, string> = {};
    if (content === "tables-and-seating") {
      for (const guest of doc.guests) {
        const seatId = guest.seatId ? seatIdMap.get(guest.seatId) : undefined;
        if (seatId) seating[guest.id] = seatId;
      }
    }
    next = { dimensions: doc.dimensions, tables, seating };
  }

  const packed = packActive(doc);
  return {
    layoutId,
    doc: {
      ...doc,
      ...unpack(doc, next),
      activeLayoutId: layoutId,
      layouts: [
        ...doc.layouts.map((layout) =>
          layout.id === doc.activeLayoutId ? { ...layout, stored: packed } : layout,
        ),
        { id: layoutId, name: layoutName, stored: null },
      ],
    },
  };
}

/** Renames a layout. A blank name is ignored. */
export function renameLayout(doc: EventDoc, layoutId: string, name: string): EventDoc {
  const cleaned = cleanLayoutName(name);
  if (!cleaned) return doc;
  let changed = false;
  const layouts = doc.layouts.map((layout) => {
    if (layout.id !== layoutId || layout.name === cleaned) return layout;
    changed = true;
    return { ...layout, name: cleaned };
  });
  return changed ? { ...doc, layouts } : doc;
}

/**
 * Deletes a layout (with its tables and seating). The last layout can't be
 * deleted. Deleting the active one switches to its neighbour first.
 */
export function deleteLayout(doc: EventDoc, layoutId: string): EventDoc {
  const index = doc.layouts.findIndex((layout) => layout.id === layoutId);
  if (index === -1 || doc.layouts.length === 1) return doc;
  let next = doc;
  if (layoutId === doc.activeLayoutId) {
    const neighbour = doc.layouts[index + 1] ?? doc.layouts[index - 1];
    next = switchLayout(doc, neighbour.id);
  }
  return { ...next, layouts: next.layouts.filter((layout) => layout.id !== layoutId) };
}

/** Drops guests from every stored layout's seating (they're being deleted). */
export function dropGuestsFromStoredLayouts(doc: EventDoc, guestIds: string[]): EventDoc {
  const gone = new Set(guestIds);
  let changed = false;
  const layouts = doc.layouts.map((layout) => {
    if (!layout.stored || !Object.keys(layout.stored.seating).some((id) => gone.has(id))) {
      return layout;
    }
    changed = true;
    const seating = Object.fromEntries(
      Object.entries(layout.stored.seating).filter(([guestId]) => !gone.has(guestId)),
    );
    return { ...layout, stored: { ...layout.stored, seating } };
  });
  return changed ? { ...doc, layouts } : doc;
}

/** A read-only view of any layout (for exports and summaries). */
export interface LayoutView {
  id: string;
  name: string;
  active: boolean;
  dimensions: Size;
  tables: Table[];
  /** guest id → seat id in this layout. */
  seating: Map<string, string>;
}

/** Every layout in order, active or not, as the same shape. */
export function layoutViews(doc: EventDoc): LayoutView[] {
  return doc.layouts.map((layout) => {
    const stored = layout.stored ?? packActive(doc);
    return {
      id: layout.id,
      name: layout.name,
      active: layout.id === doc.activeLayoutId,
      dimensions: stored.dimensions,
      tables: stored.tables,
      seating: new Map(Object.entries(stored.seating)),
    };
  });
}
