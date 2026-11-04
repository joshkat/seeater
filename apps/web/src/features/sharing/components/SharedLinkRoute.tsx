import { Link, useParams } from "react-router";

import { EventViewer } from "../../viewer/components/EventViewer";
import { useSharedLink } from "../hooks/useSharedLink";

/**
 * `/s/:token` — the public, read-only seating chart behind a share link. No
 * sign-in; nothing is stored on this device.
 */
export function SharedLinkRoute(): JSX.Element {
  const { token } = useParams();
  const { state, images } = useSharedLink(token);

  if (state.kind === "ready") {
    const { event } = state;
    return (
      <EventViewer
        doc={event.data}
        images={images}
        banner={
          <p className="text-xs text-base-content/70">
            Shared by {event.ownerName || "the organiser"} · read-only
          </p>
        }
      />
    );
  }

  const [title, detail] =
    state.kind === "loading"
      ? ["Loading the seating chart…", null]
      : state.kind === "gone"
        ? [
            "This link doesn’t work any more",
            "The organiser may have turned it off or made a new one.",
          ]
        : ["Couldn’t load the seating chart", "Check your connection, then reload the page."];

  return (
    <div className="grid min-h-screen place-items-center bg-base-200 p-4 text-center text-base-content">
      <div role="status">
        <p className="text-lg font-semibold">{title}</p>
        {detail && <p className="mt-1 text-sm text-base-content/70">{detail}</p>}
        {state.kind !== "loading" && (
          <Link to="/" className="btn btn-ghost btn-sm mt-4">
            Make your own seating chart
          </Link>
        )}
      </div>
    </div>
  );
}
