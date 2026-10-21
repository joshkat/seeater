import type { Point, Size } from "../types/geometry.js";
import { newId } from "./ids.js";
import {
  type Backdrop,
  type EventDoc,
  MAX_ROOM_OBJECT_LABEL_LENGTH,
  MAX_ROOM_OBJECTS,
  type RoomObject,
  type RoomObjectKind,
} from "./schema.js";

/**
 * Room objects (dance floor, stage, walls, labels…) and the floor-plan
 * image, for the active layout. Like tables, objects are positioned by
 * centre, size (cm) and rotation.
 */

/** What each kind is called and how big it starts (cm). */
export const ROOM_OBJECT_DEFAULTS: Record<RoomObjectKind, { name: string; size: Size }> = {
  "dance-floor": { name: "Dance floor", size: { width: 500, height: 500 } },
  stage: { name: "Stage", size: { width: 600, height: 300 } },
  bar: { name: "Bar", size: { width: 300, height: 80 } },
  buffet: { name: "Buffet", size: { width: 400, height: 80 } },
  dj: { name: "DJ booth", size: { width: 200, height: 100 } },
  door: { name: "Door", size: { width: 100, height: 20 } },
  wall: { name: "Wall", size: { width: 500, height: 15 } },
  label: { name: "Label", size: { width: 240, height: 50 } },
  area: { name: "Area", size: { width: 400, height: 300 } },
};

/** Room object kinds in menu order. */
export const ROOM_OBJECT_KINDS: RoomObjectKind[] = [
  "dance-floor",
  "stage",
  "bar",
  "buffet",
  "dj",
  "area",
  "door",
  "wall",
  "label",
];

const MIN_OBJECT_SIDE = 5;

/** Adds a room object (default size and name) and returns its id. At the
 * limit the document is unchanged (id null). */
export function addRoomObject(
  doc: EventDoc,
  kind: RoomObjectKind,
  position: Point,
): { doc: EventDoc; objectId: string | null } {
  if (doc.objects.length >= MAX_ROOM_OBJECTS) return { doc, objectId: null };
  const defaults = ROOM_OBJECT_DEFAULTS[kind];
  const object: RoomObject = {
    id: newId(),
    kind,
    label: defaults.name,
    position,
    size: { ...defaults.size },
    rotation: 0,
  };
  return { doc: { ...doc, objects: [...doc.objects, object] }, objectId: object.id };
}

export interface RoomObjectPatch {
  label?: string;
  position?: Point;
  size?: Size;
  rotation?: number;
}

/** Moves, resizes, rotates or relabels a room object. */
export function updateRoomObject(
  doc: EventDoc,
  objectId: string,
  patch: RoomObjectPatch,
): EventDoc {
  let changed = false;
  const objects = doc.objects.map((object) => {
    if (object.id !== objectId) return object;
    changed = true;
    return {
      ...object,
      label:
        patch.label === undefined
          ? object.label
          : patch.label.slice(0, MAX_ROOM_OBJECT_LABEL_LENGTH),
      position: patch.position ?? object.position,
      size: patch.size
        ? {
            width: Math.max(MIN_OBJECT_SIDE, patch.size.width),
            height: Math.max(MIN_OBJECT_SIDE, patch.size.height),
          }
        : object.size,
      rotation: patch.rotation ?? object.rotation,
    };
  });
  return changed ? { ...doc, objects } : doc;
}

/** Removes room objects. */
export function deleteRoomObjects(doc: EventDoc, objectIds: string[]): EventDoc {
  const doomed = new Set(objectIds);
  if (!doc.objects.some((object) => doomed.has(object.id))) return doc;
  return { ...doc, objects: doc.objects.filter((object) => !doomed.has(object.id)) };
}

/** Copies room objects (fresh ids, nudged). */
export function duplicateRoomObjects(
  doc: EventDoc,
  objectIds: string[],
  nudge = 24,
): { doc: EventDoc; objectIds: string[] } {
  const wanted = new Set(objectIds);
  const room = MAX_ROOM_OBJECTS - doc.objects.length;
  const copies = doc.objects
    .filter((object) => wanted.has(object.id))
    .slice(0, Math.max(0, room))
    .map((object) => ({
      ...object,
      id: newId(),
      position: { x: object.position.x + nudge, y: object.position.y + nudge },
    }));
  return {
    doc: { ...doc, objects: [...doc.objects, ...copies] },
    objectIds: copies.map((object) => object.id),
  };
}

/** Sets (or replaces) the active layout's floor-plan image. */
export function setBackdrop(doc: EventDoc, imageId: string, opacity = 0.5): EventDoc {
  const backdrop: Backdrop = { imageId, opacity: Math.min(1, Math.max(0, opacity)) };
  return { ...doc, backdrop };
}

/** Changes the floor-plan image's opacity (0..1). */
export function setBackdropOpacity(doc: EventDoc, opacity: number): EventDoc {
  if (!doc.backdrop) return doc;
  const clamped = Math.min(1, Math.max(0, opacity));
  if (clamped === doc.backdrop.opacity) return doc;
  return { ...doc, backdrop: { ...doc.backdrop, opacity: clamped } };
}

/** Removes the active layout's floor-plan image (the picture stays stored, so undo works). */
export function clearBackdrop(doc: EventDoc): EventDoc {
  return doc.backdrop ? { ...doc, backdrop: null } : doc;
}

/** Every image id any layout of the event uses (for clean-up and backups). */
export function backdropImageIds(doc: EventDoc): string[] {
  const ids = [
    doc.backdrop?.imageId,
    ...doc.layouts.map((layout) => layout.stored?.backdrop?.imageId),
  ];
  return [...new Set(ids.filter((id): id is string => !!id))];
}
