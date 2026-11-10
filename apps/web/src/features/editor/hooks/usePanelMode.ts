import { DESKTOP_QUERY, DRAWER_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";

/**
 * How the Guests and Properties panels are laid out:
 * - `fixed`: desktop (1280px and up). Both always shown.
 * - `docked`: a laptop-sized window with a mouse. Panels sit beside the floor
 *   plan (never over it) and can be closed; Guests starts open, Properties
 *   opens from its toolbar button.
 * - `drawer`: tablets and phones. Panels slide over the floor plan.
 */
export type PanelMode = "fixed" | "docked" | "drawer";

export function usePanelMode(): PanelMode {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const drawer = useMediaQuery(DRAWER_QUERY);
  if (desktop) return "fixed";
  return drawer ? "drawer" : "docked";
}
