import type { EventDoc } from "@seating/shared";
import { newlyUnseatedIds } from "@seating/shared";

import { tableNameById } from "./tableLabel";

/** How many names a notice lists before "and N more". */
const MAX_NAMES = 3;

function guestCount(count: number): string {
  return count === 1 ? "1 guest is" : `${count} guests are`;
}

/** "Ada, Grace and Linus" / "Ada, Grace, Linus and 2 more". */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length <= MAX_NAMES) {
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, MAX_NAMES).join(", ")} and ${names.length - MAX_NAMES} more`;
}

function unseatedNames(before: EventDoc, after: EventDoc): string[] {
  const names = new Map(after.guests.map((guest) => [guest.id, guest.name]));
  return newlyUnseatedIds(before, after).map((id) => names.get(id) ?? "Guest");
}

/**
 * "Deleted Table 3. 8 guests are unseated." after deleting tables — or null
 * when nobody lost a seat (a plain delete needs no notice).
 */
export function deletedTablesNotice(
  before: EventDoc,
  after: EventDoc,
  deletedIds: string[],
): string | null {
  const unseated = unseatedNames(before, after);
  if (unseated.length === 0) return null;
  const tables = before.tables.filter((table) => deletedIds.includes(table.id));
  const what =
    tables.length === 1 ? tableNameById(before.tables, tables[0].id) : `${tables.length} tables`;
  return `Deleted ${what}. ${guestCount(unseated.length)} unseated.`;
}

/**
 * "Table 5 now has 6 chairs. 2 guests are unseated (Alan Turing and Ethel
 * Turing)." after a chair cut — or null when nobody lost a seat.
 */
export function chairCutNotice(before: EventDoc, after: EventDoc, tableId: string): string | null {
  const unseated = unseatedNames(before, after);
  const table = after.tables.find((candidate) => candidate.id === tableId);
  if (unseated.length === 0 || !table) return null;
  const chairs = table.seats.length;
  return (
    `${tableNameById(after.tables, tableId)} now has ${chairs} chair${chairs === 1 ? "" : "s"}. ` +
    `${guestCount(unseated.length)} unseated (${nameList(unseated)}).`
  );
}
