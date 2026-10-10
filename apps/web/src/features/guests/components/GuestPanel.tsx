import { useMemo } from "react";

import { useTables } from "../../editor/hooks/useDocumentSelectors";
import { tableDisplayName } from "../../editor/lib/tableLabel";
import { usePanelWidth } from "../hooks/usePanelWidth";
import { useGuestStore } from "../store/guestStore";
import { AddGuestForm } from "./AddGuestForm";
import { AssignBar } from "./AssignBar";
import { GuestList, type SeatInfo } from "./GuestList";
import { ImportButton } from "./ImportButton";
import { ResizeHandle } from "./ResizeHandle";

/** Left-hand guest panel: add/import guests and assign them to seats. */
export function GuestPanel(): JSX.Element {
  const tables = useTables();
  const hasSelection = useGuestStore((state) => state.selectedGuestIds.length > 0);

  const { width, startResize, resizing } = usePanelWidth({
    storageKey: "seating.guestPanelWidth",
    defaultWidth: 380,
    min: 280,
    max: 560,
  });

  // Map every seat id to its table + seat location for the grouped seated list.
  const seatInfoFor = useMemo(() => {
    const info = new Map<string, SeatInfo>();
    tables.forEach((table, tableIndex) => {
      const tableName = tableDisplayName(table.label, tableIndex);
      table.seats.forEach((seat) => {
        info.set(seat.id, {
          tableId: table.id,
          tableName,
          tableIndex,
          seatNumber: seat.index + 1,
        });
      });
    });
    return (seatId: string): SeatInfo | null => info.get(seatId) ?? null;
  }, [tables]);

  return (
    <aside
      className="relative flex min-h-0 shrink-0 flex-col gap-2.5 border-r border-base-300 bg-base-100 p-3"
      style={{ width }}
    >
      <ResizeHandle onMouseDown={startResize} active={resizing} />
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-base-content">Guests</h2>
        {hasSelection && (
          <span className="text-[11px] text-primary">Drag to a table or pick a seat</span>
        )}
      </div>

      <AddGuestForm />
      <ImportButton />

      <AssignBar />

      <div className="h-px bg-base-300" />

      <GuestList seatInfoFor={seatInfoFor} />
    </aside>
  );
}
