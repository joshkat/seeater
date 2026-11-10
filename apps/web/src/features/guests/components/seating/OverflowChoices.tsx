import { OverflowTableChip } from "./OverflowTableChip";

/** What the overflow prompt offers (built in OverflowPrompt). */
export interface OverflowModel {
  /** The table that ran out of room. */
  name: string;
  openHere: number;
  options: { id: string; name: string; open: number }[];
  canAddChairs: boolean;
  chairsToAdd: number;
  blockedHouseholds: string[];
  leaveLabel: string;
}

interface OverflowChoicesProps {
  exact: boolean;
  model: OverflowModel;
  /** How many guests are waiting. */
  count: number;
  coveredHeight: () => number;
  onSplit: () => void;
  onPlace: (tableId: string) => void;
  onAddChairs: () => void;
  onLeave: () => void;
}

/** The overflow prompt's body: split here, other tables, add chairs, or leave them. */
export function OverflowChoices({
  exact,
  model,
  count,
  coveredHeight,
  onSplit,
  onPlace,
  onAddChairs,
  onLeave,
}: OverflowChoicesProps): JSX.Element {
  return (
    <>
      {!exact && model.openHere > 0 && model.blockedHouseholds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200 px-3 py-2 text-xs">
          <span>
            {model.name} still has {model.openHere} open seat{model.openHere === 1 ? "" : "s"}, not
            enough to keep {model.blockedHouseholds.join(", ")} together.
          </span>
          <button type="button" className="btn btn-warning btn-xs" onClick={onSplit}>
            Split household here
          </button>
        </div>
      )}

      {model.options.length > 0 ? (
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
          {model.options.map((option) => (
            <OverflowTableChip
              key={option.id}
              tableId={option.id}
              name={option.name}
              open={option.open}
              count={count}
              coveredHeight={coveredHeight}
              onPick={() => onPlace(option.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-base-content/70">No other table has open seats.</p>
      )}

      <div className="card-actions justify-end">
        {model.canAddChairs && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onAddChairs}>
            + {model.chairsToAdd} chair{model.chairsToAdd === 1 ? "" : "s"} at {model.name}
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={onLeave}>
          {model.leaveLabel}
        </button>
      </div>
    </>
  );
}
