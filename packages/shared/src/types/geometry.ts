/**
 * Basic 2D geometry primitives shared by the editor and API.
 * All coordinates are in floor-plan units (not pixels); the editor
 * applies its own pan/zoom transform on top of these.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}
