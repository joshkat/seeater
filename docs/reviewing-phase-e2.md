# Reviewing phase E2: the room, part 2

Two additions: **room objects** (roadmap 9) and a **floor-plan image to trace over** (roadmap 10).
Schema **v7**, and IndexedDB store layout **2** (database version 207).

## What a user notices

- **Room ▾** in the toolbar adds:
  - a dance floor, stage, bar, buffet, DJ booth or area;
  - a door (with its swing arc), a wall, or a text label.

  They draw under the tables. You select, drag, resize and rotate them like tables, and Delete and
  Duplicate work on any mix. With one selected, Properties shows its label or text, width and depth
  (cm or inches), rotation, and Delete.

- **Floor plan image**, in Properties with nothing selected:
  - **Upload** a PNG or JPEG of the venue plan; you can also Replace or Remove it and set the
    **opacity**.
  - It's drawn under everything, fitted to the room's width. To get the scale right, set the room
    width to the plan's real width.
  - It stays on this device: it's not part of backups, sync or the document.

## Review order

1. **`feat(shared): room objects and a floor-plan image per layout (schema v7)`**:
   - `schema.ts`: `roomObjectSchema` and `backdropSchema`, in the top-level fields and in
     `storedLayoutSchema`.
   - `roomObjectOps.ts`: defaults, add/update/delete/duplicate, and the backdrop ops.
   - `layoutOps` pack/unpack cover them. "Copy tables" copies the room too, with fresh object ids.
   - `duplicateEventDoc` gives objects fresh ids, and integrity requires object ids unique across
     layouts.
   - The v6 → v7 upgrade.
2. **`feat(web): room objects and a floor-plan image on the canvas`**:
   - `RoomObjectNode` (Konva) and `roomObjectStyle`.
   - `editorStore`: selection holds both tables and objects; `deleteSelected` / `duplicateSelected`
     compose the ops in one edit.
   - `PropertiesPanel` picks an editor from the selection (`RoomObjectEditor`).
   - **Storage:** `SeatingDb` gains the `images` store (bytes as an `ArrayBuffer`, so fake-indexeddb
     and every browser can store it). `imageRepository` handles save/get/prune, and `deleteEvent`
     also deletes the event's images.
   - **Clean-up:** `imageCleanup.pruneUnusedImages` runs when the editor closes. It keeps any
     picture the event **or any saved version** references, so restoring a version never loses its
     image. Undo history is gone by then, so nothing else needs one.
   - `BackdropLayer` + `useStoredImage`; `floorPlanImage.ts` (upload: type and size checks,
     `createImageBitmap` for dimensions).
   - The transformer's minimum box drops from 40 to 8 px, so 15 cm walls can be resized.
3. **`test: e2e for room objects and the floor-plan image`**.

## Verified

- Lint (whole repo), format, typecheck. Tests: shared **94**, web **97**, e2e **54** (108/108 over
  two repeats, desktop + iPad WebKit).
- In the browser:
  - a dance floor drawn under the tables, resized from 197″ to 300″ in Properties;
  - a wall and a label added; delete and undo;
  - an 800×500 image uploaded and drawn at 1600×1000 (the room's width) at 50% opacity.

## Decisions worth challenging

1. **The image fits the room width; you don't position or scale it separately.** Simple and
   predictable: you set the room's real width. Free positioning and cropping could come later.
2. **Images stay on this device.** They're not in backups (yet) and not synced, which keeps
   documents small. A backup restored elsewhere has no plan image.
3. **Align and distribute move tables only**, even when room objects are selected too. The panel
   says so.
4. **Room objects are per layout.** "Copy tables" copies them, and a blank layout starts empty.
