import { type PointerEvent, useEffect, useMemo, useRef } from "react";

import { useModalFocus } from "../../../lib/useModalFocus";
import { tableNameById } from "../../editor/lib/tableLabel";
import { useDocumentStore } from "../../editor/store/documentStore";
import { beginPointerDrag } from "../../dnd/lib/pointerDrag";
import { registerDropZone } from "../../dnd/lib/dropZones";
import { useDragStore } from "../../dnd/store/dragStore";
import { guestColor, guestInitials } from "../../guests/lib/guestDisplay";
import { useSeatingFlowStore } from "../../guests/store/seatingFlowStore";
import {
  addToTray,
  addableGuests,
  canSwap,
  elsewhereTableIds,
  pickGuest,
  placeGuest,
  placementPlan,
  resolvePending,
  seatOfGuest,
  trayOutcome,
  unplaceGuest,
} from "../lib/placementModel";
import { previewLayout } from "../lib/previewGeometry";
import { PlacementAddGuest } from "./PlacementAddGuest";
import { PlacementChip } from "./PlacementChip";
import { PlacementTray } from "./PlacementTray";
import { ReplaceConfirm } from "./ReplaceConfirm";
import { TablePreview } from "./TablePreview";

/**
 * Seat-by-seat placement for one table: a live preview of its chairs, the
 * guests to seat as chips, tap-a-chip-then-a-chair or drag (mouse or touch).
 * Bumping someone from a chair asks first. Confirm applies everything as one
 * change; Cancel changes nothing.
 */
export function PlacementDialog(): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement>(null);
  const placement = useSeatingFlowStore((state) => state.placement);
  const updatePlacement = useSeatingFlowStore((state) => state.updatePlacement);
  const confirmPlacement = useSeatingFlowStore((state) => state.confirmPlacement);
  const cancelPlacement = useSeatingFlowStore((state) => state.cancelPlacement);
  useModalFocus(boxRef, placement !== null);
  const doc = useDocumentStore((state) => state.doc);
  const dragging = useDragStore((state) =>
    state.drag?.payload.kind === "placement-guest" ? state.drag : null,
  );

  // Drops onto a chair or back onto the tray.
  useEffect(() => {
    const offSeat = registerDropZone("placement-seat", (payload, _point, target) => {
      if (payload.kind !== "placement-guest") return false;
      const seatId = target.closest("[data-seat-id]")?.getAttribute("data-seat-id");
      if (!seatId) return false;
      updatePlacement((state) => placeGuest(state, payload.guestId, seatId));
      return true;
    });
    const offTray = registerDropZone("placement-tray", (payload) => {
      if (payload.kind !== "placement-guest") return false;
      updatePlacement((state) => unplaceGuest(state, payload.guestId));
      return true;
    });
    return () => {
      offSeat();
      offTray();
    };
  }, [updatePlacement]);

  const table = useMemo(
    () => doc?.tables.find((candidate) => candidate.id === placement?.tableId) ?? null,
    [doc, placement?.tableId],
  );
  const layout = useMemo(() => (table ? previewLayout(table) : null), [table]);
  const guestById = useMemo(() => new Map((doc?.guests ?? []).map((g) => [g.id, g])), [doc]);

  const dragPoint = dragging?.point ?? null;
  const hoveredSeatId = useMemo(() => {
    if (!dragPoint) return null;
    const element = document.elementFromPoint(dragPoint.x, dragPoint.y);
    return element?.closest("[data-seat-id]")?.getAttribute("data-seat-id") ?? null;
  }, [dragPoint]);

  if (!placement || !doc || !table || !layout) return null;

  const tableName = tableNameById(doc.tables, table.id);
  const nameOf = (id: string): string => guestById.get(id)?.name ?? "Guest";
  const elsewhere = elsewhereTableIds(doc, placement);
  const changes = placementPlan(placement).length;
  const editing = placement.incoming.length === 0;
  const pickedSeatId = placement.picked ? seatOfGuest(placement, placement.picked) : null;
  const inviting = placement.picked !== null || dragging !== null;

  const startDrag = (event: PointerEvent, guestId: string): void => {
    beginPointerDrag(event, () => ({ kind: "placement-guest", guestId, label: nameOf(guestId) }));
  };

  const activateChair = (seatId: string): void => {
    if (placement.pending) return;
    const occupant = placement.bySeat[seatId];
    const { picked } = placement;
    if (picked && picked !== occupant) {
      updatePlacement((state) => placeGuest(state, picked, seatId));
    } else if (occupant) {
      updatePlacement((state) => pickGuest(state, occupant));
    }
  };

  const noteFor = (guestId: string): string | null => {
    const outcome = trayOutcome(placement, guestId);
    if (outcome === "unseated") return "will lose their seat";
    if (outcome === "stays" && elsewhere[guestId]) {
      return `stays at ${tableNameById(doc.tables, elsewhere[guestId])}`;
    }
    return null;
  };

  const pending = placement.pending;

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="Seat placement">
      <div
        ref={boxRef}
        className="modal-box flex max-h-[92vh] w-full max-w-4xl flex-col gap-3 p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-base-content">
              {editing ? `Edit seating — ${tableName}` : `Seat guests at ${tableName}`}
            </h2>
            <p className="text-sm text-base-content/60">
              Tap a guest, then a chair — or drag them. Nothing changes until you confirm.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancel"
            className="btn btn-ghost btn-sm btn-square min-h-11 min-w-11"
            onClick={cancelPlacement}
          >
            ✕
          </button>
        </div>

        {pending && (
          <ReplaceConfirm
            moverName={nameOf(pending.guestId)}
            occupantName={nameOf(placement.bySeat[pending.seatId] ?? "")}
            seatNumber={placement.seatIds.indexOf(pending.seatId) + 1}
            canSwap={canSwap(placement)}
            onChoose={(choice) => updatePlacement((state) => resolvePending(state, choice))}
          />
        )}

        <div className="grid min-h-0 gap-4 overflow-y-auto md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 rounded-box bg-base-200 p-2">
            {table.seats.length === 0 ? (
              <p className="p-6 text-center text-sm text-base-content/60">
                This table has no chairs. Add some in the properties panel.
              </p>
            ) : (
              <TablePreview
                layout={layout}
                tableName={tableName}
                occupantFor={(seatId) => {
                  const id = placement.bySeat[seatId];
                  if (!id) return null;
                  return {
                    name: nameOf(id),
                    initials: guestInitials(nameOf(id)),
                    color: guestColor(id),
                  };
                }}
                pickedSeatId={pickedSeatId}
                hoveredSeatId={hoveredSeatId}
                inviting={inviting}
                onChairActivate={activateChair}
                onChairPointerDown={(event, seatId) => {
                  const occupant = placement.bySeat[seatId];
                  if (occupant) startDrag(event, occupant);
                }}
              />
            )}
          </div>

          <PlacementTray
            count={placement.tray.length}
            inviting={dragging !== null || pickedSeatId !== null}
            footer={
              <PlacementAddGuest
                candidates={addableGuests(doc, placement)}
                onAdd={(guestId) => updatePlacement((state) => addToTray(state, guestId))}
              />
            }
            onActivate={() => {
              const { picked } = placement;
              if (picked && pickedSeatId) updatePlacement((state) => unplaceGuest(state, picked));
            }}
          >
            {placement.tray.map((guestId) => (
              <PlacementChip
                key={guestId}
                name={nameOf(guestId)}
                color={guestColor(guestId)}
                note={noteFor(guestId)}
                picked={placement.picked === guestId}
                onActivate={() => updatePlacement((state) => pickGuest(state, guestId))}
                onPointerDown={(event) => startDrag(event, guestId)}
              />
            ))}
          </PlacementTray>
        </div>

        <div className="modal-action mt-0 items-center">
          <span className="mr-auto text-xs text-base-content/60">
            {changes === 0 ? "No changes yet" : `${changes} change${changes === 1 ? "" : "s"}`}
          </span>
          <button type="button" className="btn min-h-11" onClick={cancelPlacement}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-11"
            disabled={pending !== null}
            onClick={confirmPlacement}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
