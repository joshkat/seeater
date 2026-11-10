import { arrivalTime } from "../lib/checkInActions";
import type { CheckInRow } from "../lib/checkInList";

interface CheckInGuestRowProps {
  row: CheckInRow;
  /** Checked in a moment ago: show the success state (with Undo) in place. */
  recent: boolean;
  onCheckIn: (guestIds: string[]) => void;
  onUndo: (guestId: string) => void;
}

/** One guest at the door: where they sit, and a big Check in button. */
export function CheckInGuestRow({
  row,
  recent,
  onCheckIn,
  onUndo,
}: CheckInGuestRowProps): JSX.Element {
  const { guest, tableName, seatNumber, householdName, partyWaitingIds } = row;
  const arrivedAt = guest.checkedInAt;
  const declined = guest.rsvpStatus === "declined";
  const where = tableName ? `${tableName} · seat ${seatNumber}` : "No seat yet";
  const undoButton = (label: string) => (
    <button
      type="button"
      className="btn btn-sm ml-auto"
      aria-label={`Undo check-in for ${guest.name}`}
      onClick={() => onUndo(guest.id)}
    >
      {label}
    </button>
  );

  if (arrivedAt && recent) {
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-box border border-success bg-success/10 p-3">
        <p className="min-w-0 flex-1 basis-48 font-semibold">
          <span aria-hidden className="text-success-strong">
            ✓{" "}
          </span>
          {guest.name}:{" "}
          <span className="font-normal">
            {tableName ? `${tableName}, seat ${seatNumber}` : "no seat yet"}
          </span>
        </p>
        {undoButton("Undo")}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className={`truncate font-semibold ${declined ? "text-base-content/70" : ""}`}>
          {guest.name}
        </p>
        <p className="text-sm text-base-content/70">
          <span className={tableName ? "font-medium text-base-content" : ""}>{where}</span>
          {householdName && <span> · {householdName}</span>}
          {declined && !arrivedAt && <span> · said they couldn’t come</span>}
          {arrivedAt && (
            <span className="font-medium text-success-strong">
              {" "}
              · ✓ Arrived {arrivalTime(arrivedAt)}
            </span>
          )}
        </p>
        {(guest.accessibility || guest.dietary) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {guest.accessibility && (
              <span className="badge badge-info badge-sm">{guest.accessibility}</span>
            )}
            {guest.dietary && <span className="badge badge-ghost badge-sm">{guest.dietary}</span>}
          </div>
        )}
      </div>
      {arrivedAt ? (
        undoButton("Undo check-in")
      ) : (
        <div className="ml-auto flex gap-2">
          {partyWaitingIds.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onCheckIn([guest.id, ...partyWaitingIds])}
            >
              Check in all {partyWaitingIds.length + 1}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            aria-label={`Check in ${guest.name}`}
            onClick={() => onCheckIn([guest.id])}
          >
            Check in
          </button>
        </div>
      )}
    </li>
  );
}
