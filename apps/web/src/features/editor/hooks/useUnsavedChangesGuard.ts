import { useEffect } from "react";

import { hasUnsavedChanges } from "../store/documentStore";

/**
 * Asks the browser to confirm leaving the page while a local save is still in
 * flight. Saves start immediately and take milliseconds, so this almost never
 * fires — it closes the small window where closing the tab could drop an edit.
 */
export function useUnsavedChangesGuard(): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      // Some browsers still require returnValue to be set to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
}
