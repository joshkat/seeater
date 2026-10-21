import { type EventDoc, layoutViews } from "@seating/shared";

import { seatingRows } from "./seatingRows";

/** Quotes a CSV cell when needed (commas, quotes, newlines). */
export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const RSVP_LABEL = { pending: "Pending", accepted: "Going", declined: "Declined" } as const;

/**
 * The guest list as CSV: details, then table and seat for every layout. The
 * detail headers are ones the importer reads back (Name, Email, Phone,
 * Household, Meal, Dietary, Accessibility, Tags, Child, Notes).
 */
export function guestsCsv(doc: EventDoc): string {
  const views = layoutViews(doc);
  const multiple = views.length > 1;
  const seats = views.map(
    (view) => new Map(seatingRows(doc, view).map((row) => [row.guest.id, row])),
  );
  const households = new Map(doc.households.map((household) => [household.id, household.name]));

  const header = [
    "Name",
    "Email",
    "Phone",
    "RSVP",
    "Household",
    "Meal",
    "Dietary",
    "Accessibility",
    "Tags",
    "Child",
    "Notes",
    ...views.flatMap((view) =>
      multiple ? [`Table (${view.name})`, `Seat (${view.name})`] : ["Table", "Seat"],
    ),
  ];

  const lines = doc.guests.map((guest) =>
    [
      guest.name,
      guest.email,
      guest.phone,
      RSVP_LABEL[guest.rsvpStatus],
      guest.householdId ? households.get(guest.householdId) : "",
      guest.meal,
      guest.dietary,
      guest.accessibility,
      guest.tags.join("; "),
      guest.isChild ? "Yes" : "",
      guest.notes,
      ...seats.flatMap((byGuest) => {
        const row = byGuest.get(guest.id);
        return [row?.tableName, row?.seatNumber];
      }),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\n") + "\n";
}

/** A safe file name from an event name. */
export function exportFileName(eventName: string, suffix: string): string {
  const base =
    eventName
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "-") || "event";
  return `${base}-${suffix}`;
}
