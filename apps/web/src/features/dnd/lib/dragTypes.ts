/** What's being dragged. Drop zones look at `kind` to decide if they accept it. */
export type DragPayload =
  /** Guests from the guest list, headed for a table on the canvas. */
  | { kind: "guests"; guestIds: string[]; label: string }
  /** A guest chip inside the seat placement dialog. */
  | { kind: "placement-guest"; guestId: string; label: string };

export interface Point {
  x: number;
  y: number;
}
