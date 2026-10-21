import { Link } from "react-router";

import { useDocumentId } from "../../editor/hooks/useDocumentSelectors";

/** Editor header: opens the day-of check-in list for this event. */
export function CheckInLink(): JSX.Element | null {
  const eventId = useDocumentId();
  if (!eventId) return null;
  return (
    <Link to={`/events/${eventId}/check-in`} className="btn btn-sm" title="Day-of check-in">
      Check-in
    </Link>
  );
}
