import { Link } from "react-router";

/** Fallback for unknown URLs. */
export function NotFoundPage(): JSX.Element {
  return (
    <div className="grid min-h-screen place-items-center bg-base-200 text-base-content">
      <div className="text-center">
        <p className="text-lg font-semibold">Page not found</p>
        <Link to="/" className="btn btn-primary btn-sm mt-4">
          Back to events
        </Link>
      </div>
    </div>
  );
}
