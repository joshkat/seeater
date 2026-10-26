import { THEMES } from "../lib/theme";
import { setTheme, useTheme } from "../lib/useTheme";

/** The theme choices as menu rows (`<li>`s), for any DaisyUI `menu`. */
export function ThemeMenuItems({ onPick }: { onPick?: () => void }): JSX.Element {
  const current = useTheme();

  return (
    <>
      {THEMES.map((theme) => (
        <li key={theme.value}>
          <button
            type="button"
            aria-pressed={current === theme.value}
            className={current === theme.value ? "menu-active" : ""}
            onClick={() => {
              setTheme(theme.value);
              onPick?.();
            }}
          >
            {theme.label}
          </button>
        </li>
      ))}
    </>
  );
}
