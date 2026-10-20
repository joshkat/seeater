import { useDragStore } from "../store/dragStore";
import type { DragPayload, Point } from "./dragTypes";
import { dispatchDrop } from "./dropZones";

export interface PointerDragOptions {
  /**
   * Touch only: how long to hold before the drag starts. Moving first cancels
   * it, so the list under your finger can still scroll. 0 = start on movement
   * like a mouse.
   */
  touchDelayMs?: number;
  /** Mouse/pen movement (px) that starts a drag; below it, it's a click. */
  threshold?: number;
  /** Called when the drag actually starts (after the delay/threshold). */
  onStart?: () => void;
  /** Called when it ends; `dropped` is true if a zone accepted it. */
  onEnd?: (dropped: boolean) => void;
}

/** Finger movement that counts as "scrolling, not dragging" while waiting. */
const TOUCH_SLOP = 8;

/**
 * Starts tracking a possible drag from a pointerdown. Works the same for
 * mouse, pen and touch (the browser's HTML5 drag-and-drop doesn't fire on
 * touch screens). Listeners live on `window`, so the source element may move
 * or hide (e.g. a drawer sliding away) mid-drag.
 *
 * A press that never becomes a drag is left alone, so it still produces a
 * normal click. After a real drag, the click that follows is swallowed.
 */
export function beginPointerDrag(
  event: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
    button: number;
  },
  getPayload: () => DragPayload | null,
  { touchDelayMs = 0, threshold = 5, onStart, onEnd }: PointerDragOptions = {},
): void {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const store = useDragStore.getState();
  if (store.drag) return;

  const { pointerId, pointerType } = event;
  const origin: Point = { x: event.clientX, y: event.clientY };
  const isTouch = pointerType === "touch";
  let active = false;
  let last = origin;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const activate = (): void => {
    const payload = getPayload();
    if (!payload) {
      cleanup();
      return;
    }
    active = true;
    document.body.classList.add("select-none");
    useDragStore.getState().start(payload, last, pointerType);
    if (isTouch) navigator.vibrate?.(10);
    onStart?.();
  };

  const onMove = (move: PointerEvent): void => {
    if (move.pointerId !== pointerId) return;
    last = { x: move.clientX, y: move.clientY };
    if (active) {
      useDragStore.getState().move(last);
      return;
    }
    const distance = Math.hypot(last.x - origin.x, last.y - origin.y);
    if (isTouch && touchDelayMs > 0) {
      if (distance > TOUCH_SLOP) cleanup(); // they're scrolling
      return;
    }
    if (distance >= (isTouch ? TOUCH_SLOP : threshold)) activate();
  };

  const onUp = (up: PointerEvent): void => {
    if (up.pointerId !== pointerId) return;
    if (!active) {
      cleanup();
      return;
    }
    const payload = useDragStore.getState().drag?.payload;
    const dropped = payload ? dispatchDrop(payload, { x: up.clientX, y: up.clientY }) : false;
    swallowNextClick();
    cleanup();
    onEnd?.(dropped);
  };

  const onCancel = (cancel: PointerEvent): void => {
    if (cancel.pointerId !== pointerId) return;
    const wasActive = active;
    cleanup();
    if (wasActive) onEnd?.(false);
  };

  const onKey = (key: KeyboardEvent): void => {
    if (key.key !== "Escape" || !active) return;
    key.stopPropagation();
    cleanup();
    onEnd?.(false);
  };

  // Once dragging, stop the page from scrolling under the finger.
  const onTouchMove = (touch: TouchEvent): void => {
    if (active) touch.preventDefault();
  };

  function cleanup(): void {
    clearTimeout(timer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("touchmove", onTouchMove);
    if (active) {
      document.body.classList.remove("select-none");
      useDragStore.getState().end();
    }
    active = false;
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  if (isTouch && touchDelayMs > 0) timer = setTimeout(activate, touchDelayMs);
}

/** Swallows the click the browser fires right after a drag's pointerup. */
function swallowNextClick(): void {
  const swallow = (click: MouseEvent): void => {
    click.stopPropagation();
    click.preventDefault();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  // If no click comes (pointer ended elsewhere), stop waiting.
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
}
