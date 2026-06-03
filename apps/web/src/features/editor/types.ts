/** Editor-local types layered on top of the shared domain model. */

/** Stage pan/zoom transform. */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** A snap/alignment guide line drawn during a drag. */
export interface AlignmentGuide {
  axis: "x" | "y";
  /** Position along the perpendicular axis, in floor-plan units. */
  position: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
