import type { LayoutView } from "@seating/shared";

import type { PrintKind } from "../store/printStore";

/** Cards and the find-your-seat board are for the meal, not the ceremony. */
const GUEST_FACING: PrintKind[] = ["find-your-seat", "place-cards", "escort-cards"];

/**
 * Which layout a print view starts on. The chart and rosters show the layout
 * being edited. Escort cards, place cards and the find-your-seat board start
 * on the layout with the most tables (chair rows don't count), since that's
 * the dinner; the active layout wins a tie.
 */
export function defaultPrintLayoutId(kind: PrintKind, views: LayoutView[]): string | null {
  const active = views.find((view) => view.active) ?? views[0];
  if (!active) return null;
  if (!GUEST_FACING.includes(kind)) return active.id;
  const tables = (view: LayoutView): number =>
    view.tables.filter((table) => table.shape !== "row").length;
  return views.reduce((best, view) => (tables(view) > tables(best) ? view : best), active).id;
}
