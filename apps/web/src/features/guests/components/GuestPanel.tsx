import { useEffect, useMemo } from 'react';

import { tableDisplayName } from '../../editor/lib/tableLabel';
import { useEditorStore } from '../../editor/store/editorStore';
import { usePanelWidth } from '../hooks/usePanelWidth';
import { useGuestStore } from '../store/guestStore';
import { AddGuestForm } from './AddGuestForm';
import { AssignBar } from './AssignBar';
import { GuestList, type SeatInfo } from './GuestList';
import { ImportButton } from './ImportButton';
import { ResizeHandle } from './ResizeHandle';

/** Left-hand guest panel: add/import guests and assign them to seats. */
export function GuestPanel(): JSX.Element {
  const floorPlanId = useEditorStore((state) => state.floorPlanId);
  const tables = useEditorStore((state) => state.tables);
  const editorReady = useEditorStore((state) => state.loadStatus === 'ready');

  const loadForFloorPlan = useGuestStore((state) => state.loadForFloorPlan);
  const loadStatus = useGuestStore((state) => state.loadStatus);
  const hasSelection = useGuestStore((state) => state.selectedGuestIds.length > 0);
  const syncAssignments = useGuestStore((state) => state.syncAssignments);

  const { width, startResize, resizing } = usePanelWidth({
    storageKey: 'seating.guestPanelWidth',
    defaultWidth: 340,
    min: 280,
    max: 560,
  });

  useEffect(() => {
    if (floorPlanId) void loadForFloorPlan(floorPlanId);
  }, [floorPlanId, loadForFloorPlan]);

  // When the set of real seats changes (e.g. a table was deleted or its chair
  // count changed), release guests whose seat no longer exists so they return
  // to the unassigned list immediately. Guarded on both stores being loaded so
  // the initial load race doesn't momentarily unseat everyone.
  useEffect(() => {
    if (!editorReady || loadStatus !== 'ready') return;
    const validSeatIds = new Set(tables.flatMap((table) => table.seats.map((seat) => seat.id)));
    syncAssignments(validSeatIds);
  }, [tables, editorReady, loadStatus, syncAssignments]);

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

      {loadStatus === 'loading' && <p className="text-sm text-base-content/60">Loading guests…</p>}
      {loadStatus === 'error' && <p className="text-sm text-error">Could not load guests.</p>}
      {loadStatus === 'ready' && <GuestList seatInfoFor={seatInfoFor} />}
    </aside>
  );
}
