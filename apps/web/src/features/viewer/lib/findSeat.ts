import type { EventDoc, LayoutView } from "@seating/shared";

import type { Bounds, ChartScene } from "../../export/lib/chartScene";
import { type SeatingRow, seatingRows, sortName } from "../../export/lib/seatingRows";

/** A guest found by "Find your seat", with where to point on the chart. */
export interface SeatMatch extends SeatingRow {
  /** Null when the guest has no seat in this layout. */
  tableId: string | null;
  seatId: string | null;
}

/** Lower case without accents, so "jose" finds "José". */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Guests whose name contains every word of `query` (case- and
 * accent-insensitive), sorted by surname. Only names are searched — the
 * viewer may be a public link, so contact details and notes stay out of it —
 * and guests who declined are left out, as on the printed board.
 */
export function findSeats(doc: EventDoc, view: LayoutView, query: string): SeatMatch[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const tableBySeat = new Map<string, string>();
  for (const table of view.tables) {
    for (const seat of table.seats) tableBySeat.set(seat.id, table.id);
  }
  return seatingRows(doc, view)
    .filter(({ guest }) => {
      if (guest.rsvpStatus === "declined") return false;
      const name = foldText(guest.name);
      return words.every((word) => name.includes(word));
    })
    .sort((a, b) => sortName(a.guest.name).localeCompare(sortName(b.guest.name)))
    .map((row) => {
      const seatId = view.seating.get(row.guest.id) ?? null;
      const tableId = seatId ? (tableBySeat.get(seatId) ?? null) : null;
      return { ...row, seatId: tableId ? seatId : null, tableId };
    });
}

/** The area one table and its chairs cover on the chart (plan units), or null. */
export function tableArea(scene: ChartScene, view: LayoutView, tableId: string): Bounds | null {
  const table = scene.tables.find((candidate) => candidate.id === tableId);
  const source = view.tables.find((candidate) => candidate.id === tableId);
  if (!table || !source) return null;
  const seatIds = new Set(source.seats.map((seat) => seat.id));
  // A rotated table fits in the circle through its corners.
  const reach = Math.hypot(table.width, table.height) / 2;
  const points = [
    { x: table.center.x - reach, y: table.center.y - reach },
    { x: table.center.x + reach, y: table.center.y + reach },
    table.label,
    ...scene.chairs
      .filter((chair) => seatIds.has(chair.seatId))
      .flatMap((chair) => [
        { x: chair.center.x - scene.chairRadius, y: chair.center.y - scene.chairRadius },
        { x: chair.center.x + scene.chairRadius, y: chair.center.y + scene.chairRadius },
      ]),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
