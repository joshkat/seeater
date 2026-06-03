import type { Point } from "@seating/shared";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";

import { getGuestDragData } from "../../../guests/lib/dnd";
import { bySeatId, guestColor, guestInitials } from "../../../guests/lib/guestDisplay";
import { useGuestStore } from "../../../guests/store/guestStore";
import { WHEEL_ZOOM, clampScale } from "../../geometry/viewport";
import { useEditorStore } from "../../store/editorStore";
import type { AlignmentGuide } from "../../types";
import { AlignmentGuides } from "./AlignmentGuides";
import type { SeatOccupant } from "./ChairNode";
import { GridLayer } from "./GridLayer";
import { SelectionTransformer } from "./SelectionTransformer";
import { TableNode } from "./TableNode";
import { ZoomControls } from "./ZoomControls";

/** Snap threshold in screen pixels (converted to plan units via scale). */
const SNAP_PX = 8;

interface Marquee {
  start: Point;
  end: Point;
}

export function EditorCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const didFit = useRef(false);
  const skipNextClick = useRef(false);

  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [marqueeMode, setMarqueeMode] = useState(false);

  const dimensions = useEditorStore((state) => state.dimensions);
  const floorPlanId = useEditorStore((state) => state.floorPlanId);
  const tables = useEditorStore((state) => state.tables);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const viewport = useEditorStore((state) => state.viewport);
  const stageSize = useEditorStore((state) => state.stageSize);
  const loadStatus = useEditorStore((state) => state.loadStatus);
  const selectTable = useEditorStore((state) => state.selectTable);
  const setSelection = useEditorStore((state) => state.setSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const updateTableTransform = useEditorStore((state) => state.updateTableTransform);
  const setSeatOffset = useEditorStore((state) => state.setSeatOffset);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setStageSize = useEditorStore((state) => state.setStageSize);
  const fitToView = useEditorStore((state) => state.fitToView);
  const focusTable = useEditorStore((state) => state.focusTable);
  const clearFocus = useEditorStore((state) => state.clearFocus);

  const guests = useGuestStore((state) => state.guests);
  const assignSeat = useGuestStore((state) => state.assignSeat);
  const assignGuestsToTable = useGuestStore((state) => state.assignGuestsToTable);

  // seatId -> visual occupant (initials + color) for chair rendering.
  const occupants = useMemo(() => {
    const seated = bySeatId(guests);
    const map = new Map<string, SeatOccupant>();
    seated.forEach((guest, seatId) => {
      map.set(seatId, {
        initials: guestInitials(guest.name),
        color: guestColor(guest.id),
        declined: guest.rsvpStatus === "declined",
      });
    });
    return map;
  }, [guests]);

  const registerNode = useCallback((id: string, node: Konva.Group | null): void => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  const tableForSeat = useCallback(
    (seatId: string) => tables.find((t) => t.seats.some((s) => s.id === seatId)),
    [tables],
  );

  // Click-to-assign: with guest(s) selected, clicking a seat seats them. A single
  // selection takes that exact seat; a multi-selection fills the seat's table.
  const handleSeatClick = useCallback(
    (seatId: string): void => {
      const { selectedGuestIds } = useGuestStore.getState();
      if (selectedGuestIds.length === 0) return;
      if (selectedGuestIds.length === 1) {
        void assignSeat(selectedGuestIds[0], seatId);
        return;
      }
      const table = tableForSeat(seatId);
      if (table) {
        void assignGuestsToTable(
          selectedGuestIds,
          table.seats.map((s) => s.id),
        );
      }
    },
    [assignSeat, assignGuestsToTable, tableForSeat],
  );

  // Drag-to-assign. A single guest dropped on a specific chair takes that seat;
  // otherwise (multiple guests, a drop on the table body, or anywhere while a
  // table is focused) the group fills that table's open seats.
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      const draggedId = getGuestDragData(event.dataTransfer);
      const stage = stageRef.current;
      const container = containerRef.current;
      if (!draggedId || !stage || !container) return;

      const rect = container.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const shape = stage.getIntersection(point);
      const seatId = shape?.getAttr("seatId") as string | undefined;
      const bodyTableId = shape?.getAttr("tableId") as string | undefined;

      const { selectedGuestIds } = useGuestStore.getState();
      const group =
        selectedGuestIds.includes(draggedId) && selectedGuestIds.length > 1
          ? selectedGuestIds
          : [draggedId];

      if (group.length === 1 && seatId) {
        void assignSeat(group[0], seatId);
        return;
      }

      const focusedTableId = useEditorStore.getState().focusedTableId;
      const targetTableId = (seatId && tableForSeat(seatId)?.id) || bodyTableId || focusedTableId;
      const table = tables.find((t) => t.id === targetTableId);
      if (table) {
        void assignGuestsToTable(
          group,
          table.seats.map((s) => s.id),
        );
      }
    },
    [assignSeat, assignGuestsToTable, tableForSeat, tables],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Track Shift to switch between pan (drag) and marquee (shift+drag).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Shift") setMarqueeMode(true);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === "Shift") setMarqueeMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Size the stage to its container. The callback is deferred to the next
  // animation frame so that ResizeObserver never fires synchronously during a
  // layout pass — which is what breaks the page when DevTools opens/closes.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let raf: number;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { width, height } = entries[0].contentRect;
        setStageSize({ width, height });
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [setStageSize]);

  // Re-fit when a different plan is opened (each event gets its own fit-to-view).
  useEffect(() => {
    didFit.current = false;
  }, [floorPlanId]);

  // Fit-to-view once per plan, after it's loaded and the stage is sized.
  useEffect(() => {
    if (didFit.current || loadStatus !== "ready") return;
    if (stageSize.width === 0 || stageSize.height === 0) return;
    fitToView();
    didFit.current = true;
  }, [loadStatus, stageSize, fitToView]);

  // Zoom in on a single selected table; restore the prior view when deselected.
  useEffect(() => {
    if (selectedIds.length === 1) focusTable(selectedIds[0]);
    else clearFocus();
  }, [selectedIds, focusTable, clearFocus]);

  // Re-center whenever the focused table is resized (or its chairs move in
  // custom mode). We only track size + seats to avoid re-running on position
  // changes caused by the focus viewport itself.
  const focusedTableId = useEditorStore((state) => state.focusedTableId);
  const focusedTable = useMemo(
    () => (focusedTableId ? tables.find((t) => t.id === focusedTableId) : undefined),
    [focusedTableId, tables],
  );
  const focusedSizeKey = focusedTable
    ? `${focusedTable.size.width}x${focusedTable.size.height}`
    : null;
  const focusedSeatsKey = focusedTable
    ? focusedTable.seats.map((s) => `${s.offset?.x ?? ""},${s.offset?.y ?? ""}`).join("|")
    : null;

  useEffect(() => {
    if (focusedTableId) focusTable(focusedTableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSizeKey, focusedSeatsKey]); // intentionally omit focusTable/focusedTableId

  const handleWheel = (event: KonvaEventObject<WheelEvent>): void => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const pointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };
    const zoomedIn = event.evt.deltaY < 0;
    const scale = clampScale(zoomedIn ? oldScale * WHEEL_ZOOM : oldScale / WHEEL_ZOOM);

    setViewport({
      scale,
      x: pointer.x - pointTo.x * scale,
      y: pointer.y - pointTo.y * scale,
    });
  };

  const handleStageDragEnd = (event: KonvaEventObject<DragEvent>): void => {
    if (event.target !== stageRef.current) return;
    const stage = stageRef.current;
    setViewport({ scale: viewport.scale, x: stage.x(), y: stage.y() });
  };

  const isEmptyTarget = (event: KonvaEventObject<MouseEvent>): boolean =>
    event.target === event.target.getStage();

  const handleMouseDown = (event: KonvaEventObject<MouseEvent>): void => {
    if (!marqueeMode || !isEmptyTarget(event)) return;
    const point = stageRef.current?.getRelativePointerPosition();
    if (point) setMarquee({ start: point, end: point });
  };

  const handleMouseMove = (): void => {
    if (!marquee) return;
    const point = stageRef.current?.getRelativePointerPosition();
    if (point) setMarquee((current) => (current ? { ...current, end: point } : current));
  };

  const handleMouseUp = (): void => {
    if (!marquee) return;
    const minX = Math.min(marquee.start.x, marquee.end.x);
    const maxX = Math.max(marquee.start.x, marquee.end.x);
    const minY = Math.min(marquee.start.y, marquee.end.y);
    const maxY = Math.max(marquee.start.y, marquee.end.y);

    const ids = tables
      .filter(
        (table) =>
          table.position.x >= minX &&
          table.position.x <= maxX &&
          table.position.y >= minY &&
          table.position.y <= maxY,
      )
      .map((table) => table.id);

    setSelection(ids);
    setMarquee(null);
    skipNextClick.current = true;
  };

  const handleClick = (event: KonvaEventObject<MouseEvent>): void => {
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }
    if (isEmptyTarget(event)) clearSelection();
  };

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative h-full w-full bg-base-200"
    >
      <ZoomControls />
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={!marqueeMode}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        <GridLayer dimensions={dimensions} />
        <Layer>
          {tables.map((table, index) => (
            <TableNode
              key={table.id}
              table={table}
              selected={selectedIds.includes(table.id)}
              tableNumber={index + 1}
              dimensions={dimensions}
              threshold={SNAP_PX / viewport.scale}
              otherCenters={tables
                .filter((other) => other.id !== table.id)
                .map((other) => other.position)}
              occupants={occupants}
              onSelect={selectTable}
              onTransform={updateTableTransform}
              onSeatMove={setSeatOffset}
              onSeatClick={handleSeatClick}
              onGuides={setGuides}
              registerNode={registerNode}
            />
          ))}
          <AlignmentGuides guides={guides} dimensions={dimensions} />
          {marquee && (
            <Rect
              x={Math.min(marquee.start.x, marquee.end.x)}
              y={Math.min(marquee.start.y, marquee.end.y)}
              width={Math.abs(marquee.end.x - marquee.start.x)}
              height={Math.abs(marquee.end.y - marquee.start.y)}
              fill="rgba(37, 99, 235, 0.1)"
              stroke="#2563eb"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
          <SelectionTransformer selectedIds={selectedIds} nodeRefs={nodeRefs} />
        </Layer>
      </Stage>
    </div>
  );
}
