import { useEffect } from "react";

/** Sets the browser tab's title while the calling page is shown, so several
 * open tabs (events, check-in, trash) can be told apart. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
