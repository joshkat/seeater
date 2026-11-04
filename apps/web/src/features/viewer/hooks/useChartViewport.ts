import type { Point } from "@seating/shared";
import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Bounds } from "../../export/lib/chartScene";
import {
  type ChartView,
  type ViewportSize,
  ZOOM_STEP,
  clampView,
  fitView,
  focusView,
  panBy,
  viewBoxOf,
  zoomAt,
} from "../lib/chartViewport";
import { useElementSize } from "./useElementSize";

/** Arrow keys move the chart by this many pixels. */
const KEY_PAN = 60;

export interface ChartViewport {
  size: ViewportSize | null;
  /** The plan area on screen (null until the element is measured). */
  viewBox: Bounds | null;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  /** Zooms to an area (e.g. a table). */
  focus: (area: Bounds) => void;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
}

function midpoint(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Pan and zoom for the read-only chart in `ref`: drag (mouse or one finger)
 * pans, the wheel or a trackpad pinch zooms at the pointer, two fingers pinch
 * and pan, arrow keys / + / − / 0 work when it has focus, and the returned
 * zoomIn / zoomOut / fit back the visible buttons. Showing a different
 * `viewKey` (another layout) fits the chart again.
 */
export function useChartViewport(
  ref: RefObject<HTMLElement | null>,
  bounds: Bounds,
  viewKey: string,
): ChartViewport {
  const size = useElementSize(ref);
  // null = fitted (and re-fitted when the element resizes).
  const [state, setState] = useState<{ key: string; view: ChartView | null }>({
    key: viewKey,
    view: null,
  });
  const pointers = useRef(new Map<number, Point>());

  function current(saved: typeof state, at: ViewportSize): ChartView {
    return saved.key === viewKey && saved.view ? saved.view : fitView(bounds, at);
  }

  function update(change: (view: ChartView, at: ViewportSize) => ChartView): void {
    if (!size) return;
    setState((saved) => ({
      key: viewKey,
      view: clampView(change(current(saved, size), size), bounds, size),
    }));
  }

  // The wheel needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const element = ref.current;
    if (!element || !size) return;
    function onWheel(event: WheelEvent): void {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const lines = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
      // A trackpad pinch arrives as ctrl + wheel with small deltas.
      const speed = event.ctrlKey ? 0.01 : 0.0015;
      const factor = Math.exp(-event.deltaY * lines * speed);
      setState((saved) => ({
        key: viewKey,
        view: clampView(zoomAt(current(saved, size!), size!, factor, anchor), bounds, size!),
      }));
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  });

  function localPoint(event: PointerEvent<HTMLElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: PointerEvent<HTMLElement>): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      // Keeps the drag going when the pointer leaves the pane.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Not an active pointer (e.g. a synthetic event): pan without capture.
    }
    pointers.current.set(event.pointerId, localPoint(event));
  }

  function onPointerMove(event: PointerEvent<HTMLElement>): void {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, localPoint(event));
    const after = [...pointers.current.values()];
    if (after.length === 1) {
      const point = after[0];
      update((view) => panBy(view, point.x - previous.x, point.y - previous.y));
      return;
    }
    // Two (or more) fingers: zoom by the change in spread of the first two,
    // about their midpoint, and pan by how far the midpoint moved.
    const spreadBefore = distance(before[0], before[1]);
    const spreadAfter = distance(after[0], after[1]);
    const midBefore = midpoint(before.slice(0, 2));
    const midAfter = midpoint(after.slice(0, 2));
    update((view, at) => {
      const factor = spreadBefore > 0 ? spreadAfter / spreadBefore : 1;
      return panBy(
        zoomAt(view, at, factor, midBefore),
        midAfter.x - midBefore.x,
        midAfter.y - midBefore.y,
      );
    });
  }

  function onPointerUp(event: PointerEvent<HTMLElement>): void {
    pointers.current.delete(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [KEY_PAN, 0],
      ArrowRight: [-KEY_PAN, 0],
      ArrowUp: [0, KEY_PAN],
      ArrowDown: [0, -KEY_PAN],
    };
    const move = moves[event.key];
    if (move) update((view) => panBy(view, move[0], move[1]));
    else if (event.key === "+" || event.key === "=")
      update((view, at) => zoomAt(view, at, ZOOM_STEP));
    else if (event.key === "-") update((view, at) => zoomAt(view, at, 1 / ZOOM_STEP));
    else if (event.key === "0") setState({ key: viewKey, view: null });
    else return;
    event.preventDefault();
  }

  return {
    size,
    viewBox: size ? viewBoxOf(current(state, size), size) : null,
    zoomIn: () => update((view, at) => zoomAt(view, at, ZOOM_STEP)),
    zoomOut: () => update((view, at) => zoomAt(view, at, 1 / ZOOM_STEP)),
    fit: () => setState({ key: viewKey, view: null }),
    focus: (area) => {
      if (size) setState({ key: viewKey, view: focusView(area, bounds, size) });
    },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
    },
  };
}
