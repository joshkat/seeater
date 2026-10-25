import type { Table } from "@seating/shared";
import { CHAIR_GAP, CHAIR_RADIUS } from "@seating/shared";

import type { Viewport } from "../types";
import type { StageSize } from "./viewport";

/** Breathing room (screen px) a table needs from the visible edge to count as shown. */
const MARGIN = 12;

/**
 * The viewport that brings a table (with its chairs) into view without
 * zooming: unchanged if it's already fully visible, otherwise panned so it
 * sits in the middle. `bottomInset` is screen space covered at the bottom
 * (e.g. by a prompt), which doesn't count as visible.
 */
export function panToShow(
  viewport: Viewport,
  stage: StageSize,
  table: Pick<Table, "position" | "size">,
  bottomInset = 0,
): Viewport {
  const visibleHeight = Math.max(0, stage.height - bottomInset);
  const radius =
    (Math.max(table.size.width, table.size.height) / 2 + CHAIR_GAP + 2 * CHAIR_RADIUS) *
    viewport.scale;
  const cx = viewport.x + table.position.x * viewport.scale;
  const cy = viewport.y + table.position.y * viewport.scale;
  const inside =
    cx - radius >= MARGIN &&
    cx + radius <= stage.width - MARGIN &&
    cy - radius >= MARGIN &&
    cy + radius <= visibleHeight - MARGIN;
  if (inside) return viewport;
  return {
    scale: viewport.scale,
    x: stage.width / 2 - table.position.x * viewport.scale,
    y: visibleHeight / 2 - table.position.y * viewport.scale,
  };
}
