import type { Household } from "@seating/shared";
import { type PointerEvent, useState } from "react";

import { type SelectModifiers, selectModifiers } from "../lib/selectModifiers";
import { SelectCheckbox } from "./SelectCheckbox";

interface HouseholdHeaderProps {
  household: Household;
  /** Members shown under this header (the unassigned ones). */
  shownCount: number;
  /** All members, seated or not. */
  allMemberIds: string[];
  /** Every member is currently selected. */
  selected: boolean;
  /** At least one member is selected. */
  partlySelected: boolean;
  onSelect: (modifiers: SelectModifiers) => void;
  /** Starts a possible drag of the whole household. */
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onRename: (name: string) => void;
  onDissolve: () => void;
}

/** A household's row in the guest list: click selects every member, drag
 * moves the whole household, plus rename and ungroup. */
export function HouseholdHeader({
  household,
  shownCount,
  allMemberIds,
  selected,
  partlySelected,
  onSelect,
  onPointerDown,
  onRename,
  onDissolve,
}: HouseholdHeaderProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const total = allMemberIds.length;

  if (editing) {
    const commit = (): void => {
      onRename(draft);
      setEditing(false);
    };
    return (
      <div className="flex items-center gap-1 px-1 py-1">
        <input
          autoFocus
          aria-label="Household name"
          className="input input-xs flex-1 text-base-content"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(event) => onSelect(selectModifiers(event))}
      title="Click to select the whole household, or drag it onto a table"
      className={`group flex cursor-grab touch-manipulation select-none items-center [-webkit-touch-callout:none] gap-2 rounded-field border px-2 py-1 ${
        selected ? "border-primary bg-primary/5" : "border-transparent"
      }`}
    >
      <SelectCheckbox
        checked={selected}
        indeterminate={partlySelected && !selected}
        label={`Select the ${household.name} household`}
        onToggle={(range) => onSelect({ additive: true, range })}
        className="-my-1"
      />
      <span aria-hidden className="text-xs text-base-content/40">
        ⌂
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-base-content">
        {household.name}
      </span>
      <span className="badge badge-ghost badge-sm shrink-0">
        {shownCount === total ? total : `${shownCount} of ${total}`}
      </span>
      <button
        type="button"
        title="Rename household"
        aria-label="Rename household"
        className="btn btn-ghost btn-xs px-1 text-base-content/40"
        onClick={(event) => {
          event.stopPropagation();
          setDraft(household.name);
          setEditing(true);
        }}
      >
        ✎
      </button>
      <button
        type="button"
        title="Ungroup (keeps the guests)"
        className="btn btn-ghost btn-xs px-1 text-base-content/40"
        onClick={(event) => {
          event.stopPropagation();
          onDissolve();
        }}
      >
        Ungroup
      </button>
    </div>
  );
}
