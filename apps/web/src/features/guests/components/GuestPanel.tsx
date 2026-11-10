import { type CSSProperties, useMemo } from "react";

import { DrawerCloseButton } from "../../editor/components/DrawerCloseButton";
import { useGuests, useTables } from "../../editor/hooks/useDocumentSelectors";
import { useDrawerState } from "../../editor/hooks/useDrawerState";
import { tableDisplayName } from "../../editor/lib/tableLabel";
import { usePanelWidth } from "../hooks/usePanelWidth";
import { StatsButton } from "../../stats/components/StatsButton";
import { GuestTotalsLine } from "../../stats/components/GuestTotalsLine";
import { GuestFilterBar } from "./filter/GuestFilterBar";
import { GuestFilterMenu } from "./filter/GuestFilterMenu";
import { GuestList, type SeatInfo } from "./GuestList";
import { GuestPanelActions } from "./GuestPanelActions";
import { ResizeHandle } from "./ResizeHandle";

/** The guest panel's widest when docked on a laptop-sized window. */
const DOCKED_MAX_WIDTH = 380;

/** Left-hand guest panel: add/import guests and assign them to seats. A fixed,
 * resizable column on desktop; docked (and closable) on laptop-sized windows; a
 * slide-over drawer on tablets and phones.
 *
 * The list comes first, so the top stays short: title + totals + Stats, search +
 * Filters, one row of actions (add, import, rules, auto-seat), then the
 * list's tabs. The bar for ticked guests docks to the bottom of the list only
 * while someone is ticked (GuestList → AssignBar). */
export function GuestPanel(): JSX.Element {
  const tables = useTables();
  const hasGuests = useGuests().length > 0;
  const { mode, open, inert, passThrough, close } = useDrawerState("guests");

  const { width, startResize, resizing } = usePanelWidth({
    storageKey: "seating.guestPanelWidth",
    defaultWidth: 380,
    min: 280,
    max: 560,
  });

  // Docked beside the floor plan on a laptop-sized window: leave it room.
  const panelWidth = mode === "docked" ? Math.min(width, DOCKED_MAX_WIDTH) : width;

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
      className={`flex min-h-0 shrink-0 flex-col gap-2 border-r border-base-300 bg-base-100 p-3 max-sm:overflow-y-auto short:gap-1.5 short:p-2 ${
        mode === "drawer"
          ? `absolute inset-y-0 left-0 z-30 w-[min(460px,92vw)] shadow-xl transition-transform ${
              open ? "" : "-translate-x-full"
            }`
          : open
            ? "relative w-(--panel-width)"
            : "hidden"
      } ${passThrough ? "pointer-events-none" : ""}`}
      style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
    >
      {/* Phones: the whole drawer scrolls (the list alone would get no height). */}
      <ResizeHandle onMouseDown={startResize} active={resizing} />
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-base-content">Guests</h2>
        <GuestTotalsLine />
        {hasGuests && <StatsButton />}
        <DrawerCloseButton label="Close guests" onClose={close} />
      </div>

      {hasGuests && (
        <div className="flex items-center gap-1.5">
          <GuestFilterBar />
          <GuestFilterMenu />
        </div>
      )}
      <GuestPanelActions />
      <GuestList seatInfoFor={seatInfoFor} />
    </aside>
  );
}
