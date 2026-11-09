import { ThemeMenuItems } from "./ThemeMenuItems";

/** "Theme ▾": the light / dark / black / purple picker (editor toolbar and dashboard). */
export function ThemeMenu(): JSX.Element {
  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        aria-label="Theme"
        className="btn btn-sm whitespace-nowrap"
      >
        Theme ▾
      </button>
      <ul className="dropdown-content menu z-30 mt-1 w-40 rounded-box border border-base-300 bg-base-100 p-1 text-sm text-base-content shadow-lg">
        <ThemeMenuItems />
      </ul>
    </div>
  );
}
