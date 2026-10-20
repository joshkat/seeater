# Reviewing phase A: the safety net

Phase A makes editing safe before the big features land: **undo/redo** (roadmap 4), **version
history + trash** (roadmap 12), and **Playwright end-to-end tests**. One PR, three parts.

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

- Lint, format, typecheck, web build: pass. Tests at the end of part 1: shared 64, web 70 (8 new
  for history). At the end of phase A: shared 65, web 77, e2e 21.
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

---

## Part 2: version history + trash

### What a user notices

- **History** in the editor header opens _Version history_:
  - **automatic versions**, taken when the event is opened and every 10 minutes while it changes;
  - **named versions** (type a name, then **Save version**);
  - for each version: **Restore**, **Copy as new event**, or delete it.
- **Restore** first saves a "Before restoring …" version, then swaps the content in as one edit. A
  toast says what happened, and ⌘Z undoes it.
- **On the dashboard, "Delete" is now "Move to trash".** There's no confirm dialog because it's
  reversible, and an **Undo** banner appears. **Trash (n)** opens `/trash`: **Restore**, **Delete
  forever** and **Empty trash** (those two confirm). Anything trashed over 30 days ago is deleted for
  good on the next dashboard or trash visit.
- Opening a trashed event's URL says "It may be in the trash", with a link to it.

### Review order

1. **`feat: storage for version history and a 30-day trash`**. **Scrutinize: it changes IndexedDB.**
   - `SeatingDb.ts`:
     - the new `versions` store;
     - `trashedAt` on records;
     - **`DATABASE_VERSION = STORE_LAYOUT_VERSION × 100 + EVENT_DOC_SCHEMA_VERSION`**. The old
       "Dexie version = schema version" couldn't express a store change. Existing databases are at
       3 and become 103.
     - Tests cover upgrading from v1 and from v3. In the browser, a real v3 database upgraded too.
   - `eventRepository.ts`:
     - `isLive` hides trashed events from the dashboard and the editor;
     - `saveEventDoc` preserves `trashedAt` (an editor tab left open on a trashed event mustn't
       un-trash it);
     - `deleteEvent` now also deletes the event's versions;
     - `purgeExpiredTrash`.
   - `syncRepository.applyPulled` keeps `trashedAt`. Trash is local, so a pull mustn't un-trash.
   - `versionRepository.ts`:
     - automatic versions are skipped when the content equals the newest version (ignoring
       `updatedAt`);
     - pruning keeps the newest 50 automatic versions per event;
     - named versions are never pruned.
   - shared `restoreEventDoc`: an old version's content under the current id.
2. **`feat(web): trash — …`**: `EventCard`, `Dashboard`, `TrashPage`/`TrashRow`, the hooks. Check
   that Delete forever and Empty trash are the only confirms.
3. **`feat(web): version history — …`**:
   - `useAutoVersions`: on open, then a 10-minute interval that saves only if the document object
     changed.
   - `versionActions.ts`: restore = safety version + `parseEventDoc` + one `apply`.
   - The dialog components.
   - `useKeyboardShortcuts` ignores everything but Escape while the dialog is open, so Backspace
     can't delete a table hidden behind it.
4. **`fix(web): seating prompts close the drawers on tablets`**. The e2e tests found this: on iPad,
   the overflow prompt appeared behind the open guest drawer and couldn't be tapped.

### How to test

1. Open an event, then **History**: an automatic "Opened" version is there.
2. Name and save a version. Change something, then **Restore** it. You'll see a toast, the content
   back, and a "Before restoring" version. ⌘Z re-applies your change.
3. **Copy as new event** opens a separate event named "… (version name)".
4. On the dashboard, **Move to trash**, then **Undo**. Trash it again, then open **Trash**:
   **Restore**, and **Delete forever** on a throwaway event.

### Decisions worth challenging

1. **Versions and trash are device-local.** Syncing versions would multiply server storage. Trash
   doesn't sync either, so an event trashed on one device stays live on another until it's purged
   and the deletion syncs. Revisit when sync comes back.
2. **Automatic versions: on open + every 10 minutes, newest 50 kept.** There's no "on close"
   version, because the next open captures the same state. A 300-guest event is about 91 KB, so 50
   versions is about 4.5 MB.
3. **Restoring brings back the old event name and settings too.** It's the whole version. The id
   and created date stay.
4. **The purge runs on dashboard/trash visits**, not on a timer. An event can outlive 30 days if the
   app isn't opened.
5. **Backups don't include versions or trash state.**

---

## Part 3: Playwright end-to-end tests

- **New workspace `apps/e2e`**, run with `npm run e2e`.
  - It builds the web app and serves it with `vite preview` on **:4280**. 4190 was the first
    choice, but WebKit refuses it as a "restricted network port".
  - It isn't part of `npm test`, so unit tests never need browsers.
- **Projects:**
  - **desktop Chrome** (1440×900);
  - **iPad Pro 11 in WebKit**, portrait and landscape. That's Safari's engine, with touch and a
    coarse pointer.
- **Specs** (21 tests across the projects; tablet-only ones skip on desktop):
  - seat by seat in the dialog, plus undo/redo;
  - overflow to another table;
  - keyboard undo;
  - trash undo and restore;
  - version save and restore;
  - tablet drawers, a long-press touch drag onto a table, and 44px targets.
- **CI:** a separate **End-to-end (Playwright)** job. It installs Chromium and WebKit and uploads the
  HTML report and traces when it fails.
- **Stability:** passed 5 repeats locally (105/105).
- **Limitations:**
  - Playwright's touchscreen can only tap, so the touch drag dispatches touch pointer events itself.
  - WebKit-on-macOS isn't iOS Safari. A real iPad is still worth a try.
