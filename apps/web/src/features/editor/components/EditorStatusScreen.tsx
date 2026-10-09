import { Link } from "react-router";

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
            ? "It may have been deleted, or it lives in another browser or account."
            : "Try reloading the page."}
        </p>
        <Link to="/" className="btn btn-primary btn-sm mt-4">
          Back to events
        </Link>
      </div>
    </div>
  );
}
