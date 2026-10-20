# Reviewing phase A: the safety net

Phase A makes editing safe before the big features land: **undo/redo** (roadmap 4), then
**version history + trash** (roadmap 12), plus **Playwright end-to-end tests**. This guide grows as
each part is added.

---

## Part 1: undo/redo

### What a user notices

- **↶ Undo / ↷ Redo** in the toolbar, and **⌘/Ctrl+Z**, **Shift+⌘/Ctrl+Z** or **Ctrl+Y**.
- **Everything you do in the editor can be undone:**
  - tables (add, move, resize, chairs, delete);
  - guests (add, import, RSVP, delete);
  - seating (drops, auto-fill, overflow choices, the placement dialog);
  - households and the exact-placement switch.
- **One action is one step.** Typing a table name is one step, not one per letter. The placement
  dialog's Confirm (many seats at once) is one step.
- Undoing something that removed the selected guests or tables clears them from the selection.
- **Inside a text field**, ⌘Z is the field's own text undo.
- **History lasts for the editing session.** The undone state is saved like any edit, but reopening
  the event starts with an empty history.

### Review order

1. **`feat(web): undo/redo history in documentStore`**
   - `editor/lib/history.ts` (pure, tested): `recordEdit` / `undo` / `redo`.
     - Coalescing applies only when the **same key** arrives within 1 s, and never across an undo.
   - `documentStore.ts`: `apply` records, and `undo`/`redo` save through the same writer.
     - History resets in `open`, `close` and `reload`. Check you agree with `reload`: a sync pull
       replaces the document, so old snapshots would describe a different version.
   - `editorStore.setTableLabel` is the only caller that passes a `coalesceKey`.
2. **`feat(web): undo/redo controls …`**
   - `historyActions.ts`: steps the document, prunes stale selections, closes prompts, and refuses
     while the placement dialog is open.
   - `UndoRedoButtons.tsx`, `useKeyboardShortcuts.ts`.
   - `lib/isTextEntry.ts` changes **which targets global shortcuts ignore**. Before, any `<input>`
     was ignored, including checkboxes and the toggle switch. Now only text-entry fields are.
     Delete/Backspace and ⌘D now also work right after ticking a checkbox.

### How to test

1. Add a table, then ⌘Z: it's gone. Then ⇧⌘Z: it's back.
2. Select it and type a name in Properties. Click the canvas, then ⌘Z once: the whole name goes.
3. Import a few guests, select them, and assign them (one table, so exact placement is on). Place
   them in the dialog and Confirm. ⌘Z once unseats all of them; ⌘Z again removes the import, and the
   selection empties.
4. Flip "Exact seat placement", then ⌘Z: it goes back to **auto**.
5. Reload: the undone state is what's saved, and Undo is disabled (fresh history).

### Verified

- Lint, format, typecheck, web build: pass. Tests: shared 64, web 70 (8 new for history).
- Steps 1–5 were driven in the browser (keyboard and buttons).

### Decisions worth challenging

1. **Session-only history.** Persisting undo across reloads is what version history (part 2) is
   for. Persisted undo would also need to merge with sync.
2. **Whole-document snapshots** instead of inverse operations. They're simpler and can't drift, and
   structural sharing keeps them small. A 300-guest event is about 91 KB raw, but most of each
   snapshot is shared.
3. **200 steps.**
4. **No "what was undone" message.** The canvas and list show the change. A toast like "Undid: seat
   Ada" would need a label on every `apply`.
5. **Undo is blocked while the placement dialog is open**, rather than undoing inside the dialog.
