import { type SharedEventResponse, parseEventDoc } from "@seating/shared";
import { useEffect, useMemo, useState } from "react";

import { ApiError, apiFetch } from "../../../lib/apiClient";
import type { ViewerImageSource } from "../../viewer/lib/viewerImages";
import { sharingApi } from "../api/sharingApi";

export type SharedLinkState =
  | { kind: "loading" }
  | { kind: "ready"; event: SharedEventResponse }
  | { kind: "gone" }
  | { kind: "offline" };

/**
 * The event behind a public link (`/s/:token`). Re-fetched whenever the tab
 * comes back into view, so a guest who left it open sees the latest chart.
 */
export function useSharedLink(token: string | undefined): {
  state: SharedLinkState;
  images: ViewerImageSource;
} {
  const [state, setState] = useState<SharedLinkState>({ kind: "loading" });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = (): void => {
      sharingApi.shared(token).then(
        (event) => {
          if (cancelled) return;
          // Old documents are upgraded like any other untrusted input.
          setState({ kind: "ready", event: { ...event, data: parseEventDoc(event.data) } });
        },
        (error: unknown) => {
          if (cancelled) return;
          const gone = error instanceof ApiError && error.status === 404;
          setState((previous) =>
            gone ? { kind: "gone" } : previous.kind === "ready" ? previous : { kind: "offline" },
          );
        },
      );
    };
    load();
    const onVisible = (): void => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token]);

  const images = useMemo<ViewerImageSource>(
    () => async (imageId) => {
      if (!token) return null;
      try {
        return await (await apiFetch(sharingApi.sharedImageUrl(token, imageId))).blob();
      } catch {
        return null;
      }
    },
    [token],
  );

  return { state: token ? state : { kind: "gone" }, images };
}
