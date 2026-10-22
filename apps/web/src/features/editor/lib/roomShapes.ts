import type { RoomObject, Table } from "@seating/shared";

/** A table or room object reduced to what an SVG overview draws. */
export interface RoomShape {
  kind: "round" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  /** A room object (dance floor, bar…) rather than a table. */
  object: boolean;
}

/** Shapes for an overview of a room: objects first (underneath), then tables. */
export function roomShapes(tables: Table[], objects: RoomObject[]): RoomShape[] {
  return [
    ...objects.map((o) => ({
      kind: "rect" as const,
      x: o.position.x,
      y: o.position.y,
      w: o.size.width,
      h: o.size.height,
      rotation: o.rotation,
      object: true,
    })),
    ...tables.map((t) => ({
      kind: t.shape === "round" ? ("round" as const) : ("rect" as const),
      x: t.position.x,
      y: t.position.y,
      w: t.size.width,
      h: t.size.height,
      rotation: t.rotation,
      object: false,
    })),
  ];
}
