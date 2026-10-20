import { Link } from "react-router";

import { useTrashedEvents } from "../hooks/useTrashedEvents";

/** "Trash (n)" in the dashboard header. */
export function TrashLink(): JSX.Element {
  const count = useTrashedEvents()?.length ?? 0;
  return (
    <Link to="/trash" className="btn btn-ghost btn-sm">
      Trash{count > 0 && <span className="badge badge-sm">{count}</span>}
    </Link>
  );
}
