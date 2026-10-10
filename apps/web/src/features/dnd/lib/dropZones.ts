import type { DragPayload, Point } from "./dragTypes";

/**
 * Drop zones are elements marked `data-drop-zone="<id>"` plus a handler
 * registered under that id. On drop, the element under the pointer decides
 * which handler runs (the ghost ignores pointer events). A handler returns
 * true if it accepted the payload.
 */
export type DropHandler = (payload: DragPayload, point: Point, target: Element) => boolean;

const handlers = new Map<string, DropHandler>();

/** Registers a zone's handler; returns the unregister function (for effects). */
export function registerDropZone(id: string, handler: DropHandler): () => void {
  handlers.set(id, handler);
  return () => {
    if (handlers.get(id) === handler) handlers.delete(id);
  };
}

/** The zone element under a viewport point, if any. */
export function dropZoneAt(point: Point): { id: string; element: Element; target: Element } | null {
  const target = document.elementFromPoint(point.x, point.y);
  const element = target?.closest("[data-drop-zone]");
  const id = element?.getAttribute("data-drop-zone");
  return target && element && id ? { id, element, target } : null;
}

/** Runs the handler for whatever zone is under the point. */
export function dispatchDrop(payload: DragPayload, point: Point): boolean {
  const zone = dropZoneAt(point);
  if (!zone) return false;
  return handlers.get(zone.id)?.(payload, point, zone.target) ?? false;
}
