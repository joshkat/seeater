import { usePanelMode } from "../hooks/usePanelMode";
import { useLayoutStore } from "../store/layoutStore";

/** Shows / hides the guest panel: a drawer on tablets and phones, a docked
 * column on laptop-sized windows. */
export function GuestsDrawerToggle(): JSX.Element {
  const docked = usePanelMode() === "docked";
  const guestsOpen = useLayoutStore((state) => state.guestsOpen);
  const guestsDocked = useLayoutStore((state) => state.guestsDocked);
  const setGuestsOpen = useLayoutStore((state) => state.setGuestsOpen);
  const setGuestsDocked = useLayoutStore((state) => state.setGuestsDocked);
  const open = docked ? guestsDocked : guestsOpen;

  return (
    <button
      type="button"
      aria-pressed={open}
      className={`btn btn-sm ${open ? "btn-active" : ""}`}
      onClick={() => (docked ? setGuestsDocked(!open) : setGuestsOpen(!open))}
    >
      Guests
    </button>
  );
}
