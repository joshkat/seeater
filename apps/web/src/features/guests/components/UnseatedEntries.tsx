import type { PointerEvent } from "react";

import type { UnassignedEntry } from "../lib/guestListModel";
import type { SelectModifiers } from "../lib/selectModifiers";
import { HouseholdHeader } from "./HouseholdHeader";

interface UnseatedEntriesProps {
  entries: UnassignedEntry[];
  selected: Set<string>;
  /** Renders one guest's row (`nested` = under a household header). */
  renderGuest: (guestId: string, nested: boolean) => JSX.Element | null;
  onSelectHousehold: (memberIds: string[], modifiers: SelectModifiers) => void;
  onHouseholdPointerDown: (event: PointerEvent, memberIds: string[], name: string) => void;
  onRenameHousehold: (householdId: string, name: string) => void;
  onDissolveHousehold: (householdId: string) => void;
}

/** Guests without a seat: lone guests and households (a header with its
 * unseated members underneath), in name order. */
export function UnseatedEntries({
  entries,
  selected,
  renderGuest,
  onSelectHousehold,
  onHouseholdPointerDown,
  onRenameHousehold,
  onDissolveHousehold,
}: UnseatedEntriesProps): JSX.Element {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {entries.map((entry) =>
        entry.kind === "guest" ? (
          renderGuest(entry.guest.id, false)
        ) : (
          <li key={entry.household.id}>
            <HouseholdHeader
              household={entry.household}
              shownCount={entry.members.length}
              allMemberIds={entry.allMemberIds}
              selected={entry.allMemberIds.every((id) => selected.has(id))}
              partlySelected={entry.allMemberIds.some((id) => selected.has(id))}
              onSelect={(modifiers) => onSelectHousehold(entry.allMemberIds, modifiers)}
              onPointerDown={(event) =>
                onHouseholdPointerDown(event, entry.allMemberIds, entry.household.name)
              }
              onRename={(name) => onRenameHousehold(entry.household.id, name)}
              onDissolve={() => onDissolveHousehold(entry.household.id)}
            />
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {entry.members.map((member) => renderGuest(member.id, true))}
            </ul>
          </li>
        ),
      )}
    </ul>
  );
}
