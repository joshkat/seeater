import type { Point } from "@seating/shared";

/** A drag rectangle on the floor, from where it started to where it is now. */
export interface Marquee {
  start: Point;
  end: Point;
}

/** Ids of the items whose centre lies inside the marquee (plan units). */
export function idsInMarquee(
  marquee: Marquee,
  items: readonly { id: string; position: Point }[],
): string[] {
  const minX = Math.min(marquee.start.x, marquee.end.x);
  const maxX = Math.max(marquee.start.x, marquee.end.x);
  const minY = Math.min(marquee.start.y, marquee.end.y);
  const maxY = Math.max(marquee.start.y, marquee.end.y);
  return items
    .filter(
      ({ position }) =>
        position.x >= minX && position.x <= maxX && position.y >= minY && position.y <= maxY,
    )
    .map((item) => item.id);
}

/** The selection after a marquee: "Select several" adds to it, Shift-drag replaces it. */
export function marqueeSelection(current: string[], inside: string[], additive: boolean): string[] {
  if (!additive) return inside;
  return [...current, ...inside.filter((id) => !current.includes(id))];
}
