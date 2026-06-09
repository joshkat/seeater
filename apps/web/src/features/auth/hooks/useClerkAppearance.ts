import { useEffect, useState } from "react";

import { type ClerkAppearance, buildClerkAppearance } from "../lib/clerkAppearance";

/**
 * Returns the Clerk `appearance` for the current DaisyUI theme, recomputing it
 * whenever the user switches themes (the theme picker flips `<html data-theme>`).
 * Passing the result to <ClerkProvider> keeps the sign-in modal + user menu in
 * sync with the rest of the app.
 */
export function useClerkAppearance(): ClerkAppearance {
  const [appearance, setAppearance] = useState<ClerkAppearance>(buildClerkAppearance);

  useEffect(() => {
    const update = (): void => setAppearance(buildClerkAppearance());
    // Recompute now in case the theme was applied after the first render.
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return appearance;
}
