import { DESKTOP_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { useDragStore } from "../../dnd/store/dragStore";
import { useLayoutStore } from "../store/layoutStore";

/**
 * Drawer behaviour for a side panel. At desktop widths panels are always
 * shown (`drawer` false). Below that they slide over the canvas; a closed
 * drawer is `inert` so keyboard focus can't land in it — except while a drag
 * that started inside it is still in progress.
 */
export function useDrawerState(panel: "guests" | "properties"): {
  drawer: boolean;
  open: boolean;
  inert: boolean;
  /** A drag is in progress: the drawer must not catch the drop (it may still
   * be sliding away), so it ignores pointer hit-testing. */
  passThrough: boolean;
  close: () => void;
} {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const open = useLayoutStore((state) =>
    panel === "guests" ? state.guestsOpen : state.propertiesOpen,
  );
  const setOpen = useLayoutStore((state) =>
    panel === "guests" ? state.setGuestsOpen : state.setPropertiesOpen,
  );
  const dragging = useDragStore((state) => state.drag !== null);
  const drawer = !desktop;
  return {
    drawer,
    open: drawer && open,
    inert: drawer && !open && !dragging,
    passThrough: drawer && dragging,
    close: () => setOpen(false),
  };
}
