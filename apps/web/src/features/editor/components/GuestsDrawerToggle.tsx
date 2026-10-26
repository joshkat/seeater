import { useLayoutStore } from "../store/layoutStore";

/** Opens / closes the Guests drawer (tablet and phone layouts). */
export function GuestsDrawerToggle(): JSX.Element {
  const guestsOpen = useLayoutStore((state) => state.guestsOpen);
  const setGuestsOpen = useLayoutStore((state) => state.setGuestsOpen);

  return (
    <button
      type="button"
      aria-pressed={guestsOpen}
      className={`btn btn-sm ${guestsOpen ? "btn-active" : ""}`}
      onClick={() => setGuestsOpen(!guestsOpen)}
    >
      Guests
    </button>
  );
}
