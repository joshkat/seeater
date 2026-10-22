# Reviewing phase I: keyboard and navigation

Roadmap 16, **keyboard shortcuts**, and 19, **minimap**. No schema change.

## What a user notices

- **Arrow keys** nudge the selected tables and objects by 10 cm (with Shift, 50 cm). A burst of
  presses is one undo step.
- **⌘/Ctrl+A** selects every table and room object in the layout.
- **⌘/Ctrl+C, then ⌘/Ctrl+V** pastes copies, offset and selected, without guests. It works in
  another layout or another event too.
- **?**, or the **⌨** toolbar button (not on phones), opens a cheat sheet of every shortcut.
- **Minimap:** once you zoom in past the whole room, an overview sits bottom-right with the visible
  part outlined. Press or drag on it to pan.

## Review order

1. **`feat(shared): move, copy and paste room items`** (`clipboardOps.ts`):
   - `moveItems` clamps **centres** to the floor, not footprints. That matches how the canvas drag
     clamps.
   - `pasteItems` respects `MAX_TABLES` / `MAX_ROOM_OBJECTS` and gives seats fresh ids.
2. **`feat(web): keyboard shortcuts, cheat sheet and minimap`**:
   - `useKeyboardShortcuts`:
     - C and V fall through to the browser when there's nothing to copy or paste, so copying page
       text still works.
     - ⌘A always takes over.
     - Arrows skip focused `<select>` / `<input>`.
   - `clipboardStore` is in memory: a reload empties it.
   - `RoomShapes` / `roomShapes` came out of the template thumbnails. The minimap uses the same
     drawing.
3. **`test(e2e): shortcuts, cheat sheet and minimap`**.

## Open question for the UX pass

The house rule is "no hidden modifier keys: anything reachable by ⌘/Shift-click needs a visible
control". **Copy / paste and select all are keyboard-only**, apart from the cheat sheet. Duplicate
is the visible same-layout equivalent. Possible additions: a Paste button that appears while the
clipboard holds something, and "Select all" in the Properties panel.
