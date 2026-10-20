import { Link } from "react-router";

import { syncConfigured } from "../../auth/lib/authConfig";

interface EditorStatusScreenProps {
  status: "idle" | "loading" | "missing" | "error";
}

/** Full-page placeholder while an event loads, or when it can't be opened. */
export function EditorStatusScreen({ status }: EditorStatusScreenProps): JSX.Element {
  if (status === "idle" || status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-base-200 text-base-content/60">
        Loading event…
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-base-200 text-center text-base-content">
      <div>
        <p className="text-lg font-semibold">
          {status === "missing"
            ? "This event isn’t on this device"
            : "Couldn’t read this event from browser storage"}
        </p>
        <p className="mt-1 text-sm text-base-content/60">
          {status === "missing"
            ? syncConfigured
              ? "It may be in the trash, or it lives in another browser or account."
              : "It may be in the trash, or it was made in a different browser."
            : "Try reloading the page."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/" className="btn btn-primary btn-sm">
            Back to events
          </Link>
          {status === "missing" && (
            <Link to="/trash" className="btn btn-ghost btn-sm">
              Open trash
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
