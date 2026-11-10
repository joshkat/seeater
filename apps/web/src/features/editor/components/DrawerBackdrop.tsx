import { usePanelMode } from "../hooks/usePanelMode";
import { useLayoutStore } from "../store/layoutStore";

/** Dims the canvas behind an open drawer (tablets and phones; docked panels cover nothing); tap to close it. */
export function DrawerBackdrop(): JSX.Element | null {
  const drawers = usePanelMode() === "drawer";
  const anyOpen = useLayoutStore((state) => state.guestsOpen || state.propertiesOpen);
  const closeDrawers = useLayoutStore((state) => state.closeDrawers);
  if (!drawers || !anyOpen) return null;
  return (
    <button
      type="button"
      aria-label="Close panel"
      className="absolute inset-0 z-20 cursor-default bg-black/30"
      onClick={closeDrawers}
    />
  );
}
