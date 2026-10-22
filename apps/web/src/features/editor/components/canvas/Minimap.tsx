import { type PointerEvent, useMemo } from "react";

import { centerViewportOn, showsWholeFloor, visibleRect } from "../../geometry/minimap";
import { useDimensions, useRoomObjects, useTables } from "../../hooks/useDocumentSelectors";
import { roomShapes } from "../../lib/roomShapes";
import { useEditorStore } from "../../store/editorStore";
import { RoomShapes } from "../RoomShapes";

/**
 * Bottom-right of the canvas while zoomed in: the whole room with the visible
 * part outlined. Press or drag on it to pan there.
 */
export function Minimap(): JSX.Element | null {
  const floor = useDimensions();
  const tables = useTables();
  const objects = useRoomObjects();
  const viewport = useEditorStore((state) => state.viewport);
  const stage = useEditorStore((state) => state.stageSize);
  const setViewport = useEditorStore((state) => state.setViewport);
  const shapes = useMemo(() => roomShapes(tables, objects), [tables, objects]);

  if (!stage.width || showsWholeFloor(viewport, stage, floor)) return null;
  const view = visibleRect(viewport, stage);
  // Strokes are drawn in plan units, so scale them with the room.
  const stroke = Math.max(floor.width, floor.height) / 120;

  function panTo(event: PointerEvent<SVGSVGElement>): void {
    const box = event.currentTarget.getBoundingClientRect();
    const point = {
      x: ((event.clientX - box.left) / box.width) * floor.width,
      y: ((event.clientY - box.top) / box.height) * floor.height,
    };
    const { viewport: current, stageSize } = useEditorStore.getState();
    setViewport(centerViewportOn(point, current, stageSize));
  }

  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-box bg-base-100/90 p-1.5 shadow">
      <svg
        role="img"
        aria-label="Room overview: press or drag to move around"
        viewBox={`0 0 ${floor.width} ${floor.height}`}
        className="block h-auto w-40 cursor-pointer touch-none max-sm:w-28"
        onPointerDown={(event) => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          panTo(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) panTo(event);
        }}
      >
        <rect width={floor.width} height={floor.height} className="fill-base-200" />
        <RoomShapes shapes={shapes} strokeWidth={stroke} />
        <rect
          x={view.x}
          y={view.y}
          width={view.width}
          height={view.height}
          className="fill-primary/10 stroke-primary"
          strokeWidth={stroke * 1.5}
        />
      </svg>
    </div>
  );
}
