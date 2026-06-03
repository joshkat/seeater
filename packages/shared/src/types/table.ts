import type { Point, Size } from "./geometry.js";
import type { Seat, SeatInput } from "./seat.js";

/** Supported table outlines. More shapes (oval, square) can be added later. */
export type TableShape = "round" | "rectangle";

/**
 * How chairs are positioned around a table.
 * - `auto`: chairs are spaced evenly; the user controls only the count.
 * - `custom`: each seat carries an explicit offset and is placed manually.
 *
 * Switching from auto to custom seeds the seats from the current auto layout
 * (handled server/client side), so users never start from an empty table.
 */
export type ChairLayoutMode = "auto" | "custom";

export interface Table {
  id: string;
  floorPlanId: string;
  label: string;
  shape: TableShape;
  /** Center position of the table within the floor plan. */
  position: Point;
  /** Rotation in degrees, clockwise, about the table center. */
  rotation: number;
  /**
   * Bounding size of the table. For `round` tables width === height
   * (diameter); for `rectangle` both are used independently.
   */
  size: Size;
  chairLayoutMode: ChairLayoutMode;
  seats: Seat[];
}

/** Fields a client may send when creating or updating a table. */
export interface TableInput {
  label?: string;
  shape: TableShape;
  position: Point;
  rotation?: number;
  size: Size;
  chairLayoutMode?: ChairLayoutMode;
  /**
   * For `auto` layouts, the desired number of chairs. The server generates
   * seats to match. Ignored when `seats` is provided for a custom layout.
   */
  seatCount?: number;
  /** Explicit seats, used for custom layouts. */
  seats?: SeatInput[];
}
