import type { Point } from "./geometry.js";

/**
 * A single chair belonging to a table.
 *
 * In `auto` chair layouts the seat's screen position is computed from its
 * `index` and the table geometry, so `offset` is typically null. In `custom`
 * layouts each seat carries an explicit `offset` (relative to the table
 * center, before table rotation) so users can place chairs freely.
 */
export interface Seat {
  id: string;
  tableId: string;
  /** Stable ordering of the seat around/within the table (0-based). */
  index: number;
  /** Optional human label, e.g. "1A". Falls back to `index + 1` in the UI. */
  label: string | null;
  /**
   * Position relative to the table center, used in custom layouts.
   * Null when the layout is auto and positions are derived.
   */
  offset: Point | null;
}

/** Fields a client may send when creating a seat. Server assigns id. */
export interface SeatInput {
  index: number;
  label?: string | null;
  offset?: Point | null;
}
