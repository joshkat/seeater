import type { DashboardEvent } from "../../storage/repository/eventRepository";

interface EventSharingBadgeProps {
  event: DashboardEvent;
}

/** "Shared by Olive · view only" on events shared with you, "Shared with 3" on yours. */
export function EventSharingBadge({ event }: EventSharingBadgeProps): JSX.Element | null {
  if (event.role === "owner") {
    if (event.memberCount === 0) return null;
    return (
      <span className="badge badge-ghost badge-sm">
        Shared with {event.memberCount} {event.memberCount === 1 ? "person" : "people"}
      </span>
    );
  }
  const owner = event.ownerName ? `Shared by ${event.ownerName}` : "Shared with you";
  return (
    <span className="badge badge-info badge-soft badge-sm text-base-content">
      {owner}
      {event.role === "viewer" ? " · view only" : ""}
    </span>
  );
}
