import { useDragStore } from "../../dnd/store/dragStore";
import { useLayoutStore } from "../store/layoutStore";
import { type PanelMode, usePanelMode } from "./usePanelMode";

/**
 * Layout state for a side panel (see usePanelMode). On desktop panels are
 * always shown. Docked (laptop windows), a closed panel is simply not
 * rendered beside the floor plan. As a drawer it slides over the canvas; a
 * closed drawer is `inert` so keyboard focus can't land in it — except while a
 * drag that started inside it is still in progress.
 */
export function useDrawerState(panel: "guests" | "properties"): {
  mode: PanelMode;
  /** Shown right now (always true on desktop). */
  open: boolean;
  inert: boolean;
  /** A drag is in progress: the drawer must not catch the drop (it may still
   * be sliding away), so it ignores pointer hit-testing. */
  passThrough: boolean;
  close: () => void;
} {
  const mode = usePanelMode();
  const drawerOpen = useLayoutStore((state) =>
    panel === "guests" ? state.guestsOpen : state.propertiesOpen,
  );
  const guestsDocked = useLayoutStore((state) => state.guestsDocked);
  const setDrawerOpen = useLayoutStore((state) =>
    panel === "guests" ? state.setGuestsOpen : state.setPropertiesOpen,
  );
  const setGuestsDocked = useLayoutStore((state) => state.setGuestsDocked);
  const dragging = useDragStore((state) => state.drag !== null);

  if (mode === "fixed") {
    return { mode, open: true, inert: false, passThrough: false, close: () => {} };
  }
  if (mode === "docked") {
    const guests = panel === "guests";
    return {
      mode,
      open: guests ? guestsDocked : drawerOpen,
      inert: false,
      passThrough: false,
      close: () => (guests ? setGuestsDocked(false) : setDrawerOpen(false)),
    };
  }
  return {
    mode,
    open: drawerOpen,
    inert: !drawerOpen && !dragging,
    passThrough: dragging,
    close: () => setDrawerOpen(false),
  };
}
