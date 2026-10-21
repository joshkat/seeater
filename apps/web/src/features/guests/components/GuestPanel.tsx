import { type CSSProperties, useMemo } from "react";

import { DrawerCloseButton } from "../../editor/components/DrawerCloseButton";
import { useTables } from "../../editor/hooks/useDocumentSelectors";
import { useDrawerState } from "../../editor/hooks/useDrawerState";
import { tableDisplayName } from "../../editor/lib/tableLabel";
import { usePanelWidth } from "../hooks/usePanelWidth";
import { useGuestStore } from "../store/guestStore";
import { GuestTotalsLine } from "../../stats/components/GuestTotalsLine";
import { AddGuestForm } from "./AddGuestForm";
import { AssignBar } from "./AssignBar";
import { GuestList, type SeatInfo } from "./GuestList";
import { ImportButton } from "./ImportButton";
import { ResizeHandle } from "./ResizeHandle";

/** Left-hand guest panel: add/import guests and assign them to seats. A fixed,
 * resizable column on desktop; a slide-over drawer on tablets. */
export function GuestPanel(): JSX.Element {
  const tables = useTables();
  const { open, inert, passThrough, close } = useDrawerState("guests");
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
      aria-label="Guests"
      inert={inert}
      className={`relative flex min-h-0 shrink-0 flex-col gap-2.5 border-r border-base-300 bg-base-100 p-3 xl:w-(--panel-width) max-xl:absolute max-xl:inset-y-0 max-xl:left-0 max-xl:z-30 max-xl:w-[min(460px,92vw)] max-xl:shadow-xl max-xl:transition-transform ${
        open ? "" : "max-xl:-translate-x-full"
      } ${passThrough ? "pointer-events-none" : ""}`}
      style={{ "--panel-width": `${width}px` } as CSSProperties}
    >
      <ResizeHandle onMouseDown={startResize} active={resizing} />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-base-content">Guests</h2>
        {hasSelection && (
          <span className="mr-auto text-[11px] text-primary">Drag to a table or pick a seat</span>
        )}
        <DrawerCloseButton label="Close guests" onClose={close} />
      </div>

      <GuestTotalsLine />
      <AddGuestForm />
      <ImportButton />

      <AssignBar />

      <div className="h-px bg-base-300" />

      <GuestList seatInfoFor={seatInfoFor} />
    </aside>
  );
}
