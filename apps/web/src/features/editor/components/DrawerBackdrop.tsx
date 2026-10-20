import { DESKTOP_QUERY, useMediaQuery } from "../../../lib/useMediaQuery";
import { useLayoutStore } from "../store/layoutStore";

/** Dims the canvas behind an open drawer (tablet widths); tap to close it. */
export function DrawerBackdrop(): JSX.Element | null {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const anyOpen = useLayoutStore((state) => state.guestsOpen || state.propertiesOpen);
  const closeDrawers = useLayoutStore((state) => state.closeDrawers);
  if (desktop || !anyOpen) return null;
  return (
    <button
      type="button"
      aria-label="Close panel"
      className="absolute inset-0 z-20 cursor-default bg-black/30"
      onClick={closeDrawers}
    />
  );
}
