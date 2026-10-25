import type { CheckInRow } from "./checkInList";

/**
 * What the screen reader hears after a check-in: "Frances Allen checked in,
 * Table 4", or "Marie Curie and 3 others checked in, Table 2" for a household
 * (the table of the guest whose button was tapped).
 */
export function checkInAnnouncement(row: CheckInRow, count: number): string {
  const others = count - 1;
  const who =
    others > 0 ? `${row.guest.name} and ${others} other${others === 1 ? "" : "s"}` : row.guest.name;
  const where = row.tableName ? `, ${row.tableName}` : ", no seat yet";
  return `${who} checked in${where}`;
}
