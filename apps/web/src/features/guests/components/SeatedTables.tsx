/** Seated guests at one table, in seat order. */
export interface SeatedTableGroup {
  tableId: string;
  name: string;
  index: number;
  items: { guestId: string; seatNumber: number }[];
}

interface SeatedTablesProps {
  groups: SeatedTableGroup[];
  renderGuest: (guestId: string, seatNumber: number) => JSX.Element | null;
  onShowTable: (tableId: string) => void;
}

/** Seated guests grouped by table. Each table's heading shows it on the map. */
export function SeatedTables({ groups, renderGuest, onShowTable }: SeatedTablesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => (
        <div key={group.tableId}>
          <h4 className="mb-0.5 text-xs font-semibold text-base-content">
            {/* The whole heading is the button (44px tall on touch), with a
                visible hint of what it does. */}
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center gap-1 rounded-field px-1.5 py-0.5 text-left hover:bg-base-200 pointer-coarse:min-h-11"
              title="Show this table on the map"
              onClick={() => onShowTable(group.tableId)}
            >
              <span className="group-hover:underline">{group.name}</span>
              <span className="font-normal text-base-content/70"> • {group.items.length}</span>
              <span className="ml-auto font-normal text-base-content/70">
                <span aria-hidden>⌖ </span>Show on map
              </span>
            </button>
          </h4>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {group.items.map((item) => renderGuest(item.guestId, item.seatNumber))}
          </ul>
        </div>
      ))}
    </div>
  );
}
