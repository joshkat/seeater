import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { type RefObject, useEffect, useRef, useState } from "react";

import { type Marquee, idsInMarquee, marqueeSelection } from "../../geometry/marquee";
import { useRoomObjects, useTables } from "../../hooks/useDocumentSelectors";
import { useEditorStore } from "../../store/editorStore";

interface MarqueeSelection {
  marquee: Marquee | null;
  /** True while a drag on empty floor draws a marquee instead of panning. */
  active: boolean;
  onPointerDown: (event: KonvaEventObject<PointerEvent>) => void;
  onPointerMove: (event: KonvaEventObject<PointerEvent>) => void;
  onPointerUp: () => void;
  /** True once after a marquee ends, so its click doesn't clear the selection. */
  consumeClick: () => boolean;
}

/**
 * Drag-to-select on empty floor: with Shift held (replaces the selection) or
 * in Select ▾ → "Select several" (adds to it; works by touch too). Picks up
 * tables and room objects whose centre is inside.
 */
export function useMarqueeSelection(stageRef: RefObject<Konva.Stage | null>): MarqueeSelection {
  const tables = useTables();
  const roomObjects = useRoomObjects();
  const selectSeveral = useEditorStore((state) => state.selectSeveral);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const pointerId = useRef<number | null>(null);
  const skipClick = useRef(false);
  const active = shiftHeld || selectSeveral;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Shift") setShiftHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const onPointerDown = (event: KonvaEventObject<PointerEvent>): void => {
    // A second finger means a pinch, not a marquee.
    if (!event.evt.isPrimary) {
      pointerId.current = null;
      setMarquee(null);
      return;
    }
    if (!active || event.target !== event.target.getStage()) return;
    const point = stageRef.current?.getRelativePointerPosition();
    if (!point) return;
    pointerId.current = event.evt.pointerId;
    setMarquee({ start: point, end: point });
  };

  const onPointerMove = (event: KonvaEventObject<PointerEvent>): void => {
    if (!marquee || event.evt.pointerId !== pointerId.current) return;
    const point = stageRef.current?.getRelativePointerPosition();
    if (point) setMarquee((current) => (current ? { ...current, end: point } : current));
  };

  const onPointerUp = (): void => {
    if (!marquee) return;
    const inside = idsInMarquee(marquee, [...tables, ...roomObjects]);
    const editor = useEditorStore.getState();
    editor.setSelection(marqueeSelection(editor.selectedIds, inside, editor.selectSeveral));
    setMarquee(null);
    pointerId.current = null;
    skipClick.current = true;
  };

  const consumeClick = (): boolean => {
    const skip = skipClick.current;
    skipClick.current = false;
    return skip;
  };

  return { marquee, active, onPointerDown, onPointerMove, onPointerUp, consumeClick };
}
