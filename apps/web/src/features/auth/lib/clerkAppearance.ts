/**
 * Builds a Clerk `appearance` object from the app's live DaisyUI theme so the
 * sign-in modal and user menu match whatever theme is active
 * (light / dark / black / purple).
 *
 * DaisyUI v5 exposes each theme's colors as CSS custom properties on
 * <html> (e.g. `--color-primary`, `--color-base-100`). We read their resolved
 * values and hand concrete colors to Clerk — Clerk derives hover/border shades
 * in JS, so it needs parseable colors (a raw `var(--x)` string wouldn't work).
 * Rebuild this whenever `data-theme` changes (see useClerkAppearance).
 */

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Fallbacks match the default "seating" (light) theme in global.css. */
const FALLBACKS = {
  "--color-primary": "#2563eb",
  "--color-primary-content": "#ffffff",
  "--color-base-100": "#ffffff",
  "--color-base-300": "#e2e8f0",
  "--color-base-content": "#0f172a",
  "--color-error": "#dc2626",
  "--radius-field": "0.375rem",
} as const;

type ThemeVar = keyof typeof FALLBACKS;

function readVar(styles: CSSStyleDeclaration, name: ThemeVar): string {
  return styles.getPropertyValue(name).trim() || FALLBACKS[name];
}

/** Read the current theme's colors and map them onto Clerk's appearance API. */
export function buildClerkAppearance() {
  if (typeof window === "undefined") {
    return { variables: { fontFamily: FONT_FAMILY } };
  }

  const styles = getComputedStyle(document.documentElement);
  const primary = readVar(styles, "--color-primary");
  const primaryContent = readVar(styles, "--color-primary-content");
  const base100 = readVar(styles, "--color-base-100");
  const base300 = readVar(styles, "--color-base-300");
  const baseContent = readVar(styles, "--color-base-content");
  const error = readVar(styles, "--color-error");
  const radius = readVar(styles, "--radius-field");

  return {
    variables: {
      colorPrimary: primary,
      colorTextOnPrimaryBackground: primaryContent,
      colorText: baseContent,
      colorBackground: base100,
      colorInputBackground: base100,
      colorInputText: baseContent,
      colorDanger: error,
      // Clerk derives subtle greys/borders from this; base-content is near-black
      // on light themes and near-white on dark ones, so borders adapt correctly.
      colorNeutral: baseContent,
      borderRadius: radius,
      fontFamily: FONT_FAMILY,
    },
    elements: {
      // Match the app's base-300 hairline borders on the modal + inputs.
      card: { borderColor: base300 },
      formFieldInput: { borderColor: base300 },
      socialButtonsBlockButton: { borderColor: base300 },
      dividerLine: { backgroundColor: base300 },
      userButtonPopoverCard: { borderColor: base300 },
    },
  };
}

export type ClerkAppearance = ReturnType<typeof buildClerkAppearance>;
