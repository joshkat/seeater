import { arrivalTime, checkInGuests, undoCheckIn } from "../lib/checkInActions";
import type { CheckInRow } from "../lib/checkInList";

/** One guest at the door: where they sit, and a big Check in button. */
export function CheckInGuestRow({ row }: { row: CheckInRow }): JSX.Element {
  const { guest, tableName, seatNumber, householdName, partyWaitingIds } = row;
  const arrivedAt = guest.checkedInAt;
  const declined = guest.rsvpStatus === "declined";
  const where = tableName ? `${tableName} · seat ${seatNumber}` : "No seat yet";

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className={`truncate font-semibold ${declined ? "text-base-content/60" : ""}`}>
          {guest.name}
        </p>
        <p className="text-sm text-base-content/70">
          <span className={tableName ? "font-medium text-base-content" : ""}>{where}</span>
          {householdName && <span> · {householdName}</span>}
          {declined && <span> · said they couldn’t come</span>}
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
        <button
          type="button"
          className="btn btn-success btn-outline btn-sm"
          aria-label={`Undo check-in for ${guest.name}`}
          title="Tap to undo this check-in"
          onClick={() => undoCheckIn(guest.id)}
        >
          ✓ {arrivalTime(arrivedAt)}
        </button>
      ) : (
        <div className="ml-auto flex gap-2">
          {partyWaitingIds.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => checkInGuests([guest.id, ...partyWaitingIds])}
            >
              Check in all {partyWaitingIds.length + 1}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            aria-label={`Check in ${guest.name}`}
            onClick={() => checkInGuests([guest.id])}
          >
            Check in
          </button>
        </div>
      )}
    </li>
  );
}
