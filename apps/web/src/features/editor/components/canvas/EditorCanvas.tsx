import type { Point } from "@seating/shared";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";

import type { Point as ScreenPoint } from "../../../dnd/lib/dragTypes";
import { registerDropZone } from "../../../dnd/lib/dropZones";
import { registerChartCapture } from "../../../export/lib/chartCapture";
import { useRuleProblems } from "../../../rules/hooks/useRuleProblems";
import { useDragStore } from "../../../dnd/store/dragStore";
import { bySeatId, guestInitials } from "../../../guests/lib/guestDisplay";
import { useGuestStore } from "../../../guests/store/guestStore";
import { type SeatTarget, useSeatingFlowStore } from "../../../guests/store/seatingFlowStore";
import { type PinchFrame, WHEEL_ZOOM, clampScale, pinchViewport } from "../../geometry/viewport";
import {
  useBackdrop,
  useDimensions,
  useDocumentId,
  useRoomObjects,
  useGuests,
  useTables,
} from "../../hooks/useDocumentSelectors";
import { useCanvasKeyboard } from "../../hooks/useCanvasKeyboard";
import { categoryColors, chairColor } from "../../lib/chairColors";
import { useEditorStore } from "../../store/editorStore";
import { useTablePreviewStore } from "../../store/tablePreviewStore";
import { useViewPrefsStore } from "../../store/viewPrefsStore";
import type { AlignmentGuide } from "../../types";
import { AlignmentGuides } from "./AlignmentGuides";
import { BackdropLayer } from "./BackdropLayer";
import { RoomObjectNode } from "./RoomObjectNode";
import { ChairColorLegend } from "./ChairColorLegend";
import { Minimap } from "./Minimap";
import type { SeatOccupant } from "./ChairNode";
import { GridLayer } from "./GridLayer";
import { KeyboardFocusRing } from "./KeyboardFocusRing";
import { SelectionTransformer } from "./SelectionTransformer";
import { TableNode } from "./TableNode";
import { ZoomControls } from "./ZoomControls";

// Keep hit-testing during drags so a second finger can still be read (pinch).
Konva.hitOnDragEnabled = true;

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
  const fittedFor = useRef<string | null>(null);
  const skipNextClick = useRef(false);
  const pinch = useRef<PinchFrame | null>(null);

  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [marqueeMode, setMarqueeMode] = useState(false);

  const dimensions = useDimensions();
  const documentId = useDocumentId();
  const tables = useTables();
  const roomObjects = useRoomObjects();
  const ruleTableIds = useRuleProblems().tableIds;
  const backdrop = useBackdrop();
  const updateRoomObject = useEditorStore((state) => state.updateRoomObject);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const highlightedSeatId = useEditorStore((state) => state.highlightedSeatId);
  // A table the overflow prompt is pointing at (hover / focus on its chip).
  const previewTableId = useTablePreviewStore((state) => state.tableId);
  const viewport = useEditorStore((state) => state.viewport);
  const stageSize = useEditorStore((state) => state.stageSize);
  const selectTable = useEditorStore((state) => state.selectTable);
  const setSelection = useEditorStore((state) => state.setSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const updateTableTransform = useEditorStore((state) => state.updateTableTransform);
  const setSeatOffset = useEditorStore((state) => state.setSeatOffset);
  const setViewport = useEditorStore((state) => state.setViewport);
  const setStageSize = useEditorStore((state) => state.setStageSize);
  const fitToView = useEditorStore((state) => state.fitToView);
  const focusTable = useEditorStore((state) => state.focusTable);
  // Not drawn until the first fit, so a reload never flashes the room at 100%.
  const fitted = useEditorStore((state) => state.homeViewport !== null);
  const clearFocus = useEditorStore((state) => state.clearFocus);

  const guests = useGuests();
  const requestSeating = useSeatingFlowStore((state) => state.requestSeating);
  const openPlacement = useSeatingFlowStore((state) => state.openPlacement);
  const keyboard = useCanvasKeyboard(tables, roomObjects, selectedIds, selectTable, (id) =>
    openPlacement(id, []),
  );

  // seatId -> visual occupant (initials + color) for chair rendering. The
  // colour follows the "Colour chairs by" choice (guest, tag, meal, RSVP).
  const colorMode = useViewPrefsStore((state) => state.chairColorMode);
  const occupants = useMemo(() => {
    const seated = bySeatId(guests);
    const colors = categoryColors([...seated.values()], colorMode);
    const map = new Map<string, SeatOccupant>();
    seated.forEach((guest, seatId) => {
      map.set(seatId, {
        initials: guestInitials(guest.name),
        color: chairColor(guest, colorMode, colors),
        declined: guest.rsvpStatus === "declined",
      });
    });
    return map;
  }, [guests, colorMode]);

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
      const table = tableForSeat(seatId);
      if (selectedGuestIds.length === 0 || !table) return;
      requestSeating(selectedGuestIds, { kind: "seat", tableId: table.id, seatId });
    },
    [requestSeating, tableForSeat],
  );

  // Drag-to-assign: what a guest drop at this viewport point would target. A
  // chair targets that seat (a single guest takes it; a group fills its
  // table); the table body, or anywhere while a table is focused, fills that
  // table. Household checks and leftovers are handled by the seating flow.
  const dropTargetAt = useCallback(
    (point: ScreenPoint): SeatTarget | null => {
      const stage = stageRef.current;
      const container = containerRef.current;
      if (!stage || !container) return null;
      const rect = container.getBoundingClientRect();
      const shape = stage.getIntersection({ x: point.x - rect.left, y: point.y - rect.top });
      const seatId = shape?.getAttr("seatId") as string | undefined;
      const seatTableId = seatId ? tableForSeat(seatId)?.id : undefined;
      if (seatId && seatTableId) return { kind: "seat", tableId: seatTableId, seatId };
      const tableId =
        (shape?.getAttr("tableId") as string | undefined) ||
        useEditorStore.getState().focusedTableId;
      return tableId ? { kind: "table", tableId } : null;
    },
    [tableForSeat],
  );

  useEffect(
    () =>
      registerDropZone("canvas", (payload, point) => {
        if (payload.kind !== "guests") return false;
        const target = dropTargetAt(point);
        if (!target) return false;
        requestSeating(payload.guestIds, target);
        return true;
      }),
    [dropTargetAt, requestSeating],
  );

  // Export: render the whole floor plan at 1:1 (×2 for sharpness), without
  // the grid or selection handles, then put the view back.
  useEffect(
    () =>
      registerChartCapture(() => {
        const stage = stageRef.current;
        if (!stage) return null;
        const saved = { position: stage.position(), scale: stage.scale(), size: stage.size() };
        const hidden = [...stage.find("Transformer"), ...stage.find(".grid-line")];
        hidden.forEach((node) => node.visible(false));
        stage.position({ x: 0, y: 0 });
        stage.scale({ x: 1, y: 1 });
        stage.size(dimensions);
        try {
          // Crop to the tables (plus a margin) so the chart fills the page;
          // an empty floor plan exports whole.
          const boxes = [...nodeRefs.current.values()].map((node) => node.getClientRect());
          const margin = 40;
          const crop =
            boxes.length === 0
              ? { x: 0, y: 0, width: dimensions.width, height: dimensions.height }
              : (() => {
                  const minX = Math.max(0, Math.min(...boxes.map((b) => b.x)) - margin);
                  const minY = Math.max(0, Math.min(...boxes.map((b) => b.y)) - margin);
                  const maxX = Math.min(
                    dimensions.width,
                    Math.max(...boxes.map((b) => b.x + b.width)) + margin,
                  );
                  const maxY = Math.min(
                    dimensions.height,
                    Math.max(...boxes.map((b) => b.y + b.height)) + margin,
                  );
                  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
                })();
          return stage.toDataURL({ ...crop, pixelRatio: 2, mimeType: "image/png" });
        } finally {
          stage.position(saved.position);
          stage.scale(saved.scale);
          stage.size(saved.size);
          hidden.forEach((node) => node.visible(true));
          stage.batchDraw();
        }
      }),
    [dimensions],
  );

  // While guests are dragged over the canvas, highlight the table they'd land
  // on. A subscription (not a render-time read) so the canvas only re-renders
  // when the highlighted table changes, not on every pointer move.
  const [dropHighlightTableId, setDropHighlightTableId] = useState<string | null>(null);
  useEffect(
    () =>
      useDragStore.subscribe((state) => {
        const point = state.drag?.payload.kind === "guests" ? state.drag.point : null;
        setDropHighlightTableId(point ? (dropTargetAt(point)?.tableId ?? null) : null);
      }),
    [dropTargetAt],
  );

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

  // Fit-to-view once per event, as soon as the stage has a size (and again if
  // the per-event view state was reset, since the stage stays hidden until then).
  useEffect(() => {
    if (!documentId || (fittedFor.current === documentId && fitted)) return;
    if (stageSize.width === 0 || stageSize.height === 0) return;
    fitToView();
    fittedFor.current = documentId;
  }, [documentId, stageSize, fitToView, fitted]);

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

  // Two fingers: pinch to zoom and pan together. A second finger turns any
  // drag in progress (a table, or the one-finger pan) into the pinch.
  const handleTouchMove = (event: KonvaEventObject<TouchEvent>): void => {
    const { touches } = event.evt;
    const stage = stageRef.current;
    if (touches.length !== 2 || !stage) {
      pinch.current = null;
      return;
    }
    event.evt.preventDefault();
    if (stage.isDragging()) stage.stopDrag();
    nodeRefs.current.forEach((node) => {
      if (node.isDragging()) node.stopDrag();
    });
    const rect = stage.container().getBoundingClientRect();
    const a = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
    const b = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top };
    const frame: PinchFrame = {
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
    if (pinch.current) {
      setViewport(pinchViewport(useEditorStore.getState().viewport, pinch.current, frame));
    }
    pinch.current = frame;
  };

  const handleTouchEnd = (event: KonvaEventObject<TouchEvent>): void => {
    if (event.evt.touches.length < 2) pinch.current = null;
  };

  const handleStageDragEnd = (event: KonvaEventObject<DragEvent>): void => {
    if (event.target !== stageRef.current) return;
    const stage = stageRef.current;
    setViewport({ scale: viewport.scale, x: stage.x(), y: stage.y() });
  };

  const isEmptyTarget = (event: KonvaEventObject<MouseEvent | TouchEvent>): boolean =>
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

  // Click (mouse) or tap (touch) on empty floor clears the selection.
  const handleClick = (event: KonvaEventObject<MouseEvent | TouchEvent>): void => {
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }
    if (isEmptyTarget(event)) clearSelection();
  };

  return (
    <div
      ref={containerRef}
      data-drop-zone="canvas"
      tabIndex={0}
      role="group"
      aria-label={`Floor plan, ${tables.length} table${tables.length === 1 ? "" : "s"}`}
      aria-describedby="floor-plan-help"
      className="relative h-full w-full touch-none bg-base-200 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      {...keyboard.handlers}
    >
      <p id="floor-plan-help" className="sr-only">
        Tab moves between tables and room items.
      </p>
      <p className="sr-only" aria-live="polite">
        {keyboard.announcement}
      </p>
      <ZoomControls />
      <ChairColorLegend />
      <Minimap />
      <Stage
        ref={stageRef}
        className={fitted ? undefined : "invisible"}
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
        onTap={handleClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <GridLayer dimensions={dimensions} />
        <BackdropLayer backdrop={backdrop} dimensions={dimensions} />
        <Layer>
          {/* Room objects sit under the tables. */}
          {roomObjects.map((object) => (
            <RoomObjectNode
              key={object.id}
              object={object}
              selected={selectedIds.includes(object.id)}
              dimensions={dimensions}
              onSelect={selectTable}
              onChange={updateRoomObject}
              registerNode={registerNode}
            />
          ))}
          {tables.map((table, index) => (
            <TableNode
              key={table.id}
              table={table}
              selected={selectedIds.includes(table.id)}
              dropHighlight={dropHighlightTableId === table.id || previewTableId === table.id}
              highlightedSeatId={highlightedSeatId}
              ruleWarning={ruleTableIds.has(table.id)}
              tableNumber={index + 1}
              dimensions={dimensions}
              threshold={SNAP_PX / viewport.scale}
              otherCenters={tables
                .filter((other) => other.id !== table.id)
                .map((other) => other.position)}
              occupants={occupants}
              onSelect={selectTable}
              onOpenSeating={(id) => openPlacement(id, [])}
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
          {keyboard.focusedItem && (
            <KeyboardFocusRing item={keyboard.focusedItem} scale={viewport.scale} />
          )}
          <SelectionTransformer selectedIds={selectedIds} nodeRefs={nodeRefs} />
        </Layer>
      </Stage>
    </div>
  );
}
