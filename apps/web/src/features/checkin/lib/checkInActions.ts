import { addGuests, clearCheckIns, setCheckedIn } from "@seating/shared";

import { useDocumentStore } from "../../editor/store/documentStore";

/** Check-in edits (each one undo step). */

export function checkInGuests(guestIds: string[]): void {
  const now = new Date().toISOString();
  useDocumentStore.getState().apply((doc) => setCheckedIn(doc, guestIds, now));
}

export function undoCheckIn(guestId: string): void {
  useDocumentStore.getState().apply((doc) => setCheckedIn(doc, [guestId], null));
}

/** Adds someone who wasn't on the list and checks them in. Returns their id. */
export function addWalkIn(name: string): string | null {
  const now = new Date().toISOString();
  let guestId: string | null = null;
  useDocumentStore.getState().apply((doc) => {
    const added = addGuests(doc, [{ name, rsvpStatus: "accepted" }]);
    guestId = added.guestIds[0] ?? null;
    return setCheckedIn(added.doc, added.guestIds, now);
  });
  return guestId;
}

export function resetCheckIns(): void {
  useDocumentStore.getState().apply(clearCheckIns);
}

/** "7:42 PM" (in the viewer's locale). */
export function arrivalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
