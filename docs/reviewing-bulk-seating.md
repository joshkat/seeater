# Reviewing bulk seating + households

A guide for auditing the PR for roadmap item 1, **bulk seating at the table level**: the overflow
prompt, households, and quick multi-select. It covers what changed, the order to read it in, what
to scrutinize, how to test it yourself, what was and wasn't verified, and the decisions worth
challenging.

> **Size:** about 1.9k lines added and 150 removed across 36 files. Without tests it's about 1.5k
> added (the shared ops and the web UI). Tests add about 430.

---

## What a user notices

- **Leftovers no longer vanish.** Seat 5 guests at a table with 3 open seats: 3 are seated, the
  other 2 **stay selected**, and a prompt at the bottom of the canvas says _"2 guests didn't fit at
  Table 3 — pick another table"_. It lists every table with room and its open seats (green = all of
  them fit), plus **+N chairs at Table 3**, and **Leave unseated** (or **Keep current seats** if
  they were already seated). It repeats until everyone is placed or skipped.
- **Households.** Guests can belong to a household (family, couple, party):
  - the Unassigned list groups members under a ⌂ header;
  - clicking the header selects every member, and dragging it carries the whole household;
  - the header has rename and **Ungroup**;
  - selecting several guests offers **Group as household** / **Remove from household**;
  - import reads a **Household** or **Party** column.
- **Never split a household without asking.** Any move that would leave members at different
  tables first asks: _"Ada is in the Lovelace household… Move whole household (3) to Table 1 /
  Only Ada / Cancel"_. When filling a table, households go in whole or not at all. If one doesn't
  fit, the overflow prompt offers **Split household here** explicitly.
- **Selecting is visible.** Each guest has a checkbox where the initials used to be (tick to add or
  remove, no ⌘ needed). Household headers have one too (half-filled when only some members are
  picked), and the column header has select-all. Columns are labelled (Guest / RSVP).
- **Number fields** can be blank while you type and apply on blur or Enter, with −/+ buttons and no
  browser spinner.
- **Quick multi-select.** Shift-click selects a range (⌘/Ctrl+Shift extends). **Select next [8]**
  grabs the next batch of unassigned guests after the current selection, skipping declined ones.
- **Escape** closes an open seating prompt (the guests stay selected).

## The seating flow

```mermaid
flowchart TD
  A["Drop on canvas / click a seat /<br/>Assign to table…"] --> R["seatingFlowStore.requestSeating(guestIds, target)"]
  R --> S{"householdSplits()<br/>would split a household?"}
  S -- yes --> Q["HouseholdPrompt<br/>Move whole household · Only these · Cancel"]
  Q -- "whole: expandToHouseholds()" --> SEAT
  Q -- only these --> SEAT
  S -- no --> SEAT{"single guest<br/>dropped on a chair?"}
  SEAT -- yes --> AS["assignSeat() — that exact chair"]
  SEAT -- no --> FILL["assignGuestsToTable()<br/>households all-or-nothing"]
  FILL --> L{"anyone left over?"}
  L -- no --> T["toast: Seated N at Table X<br/>selection cleared"]
  L -- yes --> O["OverflowPrompt<br/>leftovers stay selected"]
  O -- "another table" --> FILL
  O -- "Split household here" --> SPLIT["assignGuestsToTable(…, splitHouseholds)"] --> L
  O -- "+N chairs" --> CH["addChairsAndAssign()"] --> L
  O -- "Leave / Keep current seats" --> X["selection cleared"]
```

Every document change here is a pure op in `@seating/shared`, applied through
`documentStore.apply`. `seatingFlowStore` only holds prompt state.

---

## Review order (commit by commit)

Each commit typechecks and lints on its own, and the branch tip passes everything.

### 1. `feat(shared): households (schema v2) and household-aware table seating`

**Scrutinize. This is the contract.**

- `schema.ts`: `householdSchema` (id + non-blank name), `guest.householdId`, `households[]` capped
  at `MAX_GUESTS`. `EVENT_DOC_SCHEMA_VERSION = 2`.
- `integrity.ts`: household ids unique, and a guest's `householdId` must exist.
- `migrate.ts`: the `1 → 2` step (empty `households`, every guest `householdId: null`).
  `upgradeEventDoc` is now exported for the storage migration (commit 2).
- `householdOps.ts`: check that every op that can empty a household calls `pruneEmptyHouseholds`
  (`createHousehold`, `removeFromHousehold`, `dissolveHousehold`, and `removeGuest` in guestOps).
  - `householdSplits` defines what "splitting" means: some members move, and at least one other
    member is not already at the target table (unseated counts as "apart").
  - `expandToHouseholds` keeps a family contiguous (missing members go right after the first one
    picked).
- `guestOps.ts`:
  - `assignGuestsToTable` now builds **seating units** (a household's members in the group are one
    unit) and packs them greedily. A unit that doesn't fit is skipped, and smaller units after it
    still get seats. It returns `seatedIds` / `unseatedIds`. Guests who don't fit **keep their
    current seat**, unless the group needed that seat.
  - `openSeatIds`/`openSeatCount` were pulled out of it (seats held by the group count as open).
  - `addChairsAndAssign` grows the table by exactly the shortfall (capped at 64) via `setSeatCount`.
  - `addGuests` takes `household` names and matches existing households case-insensitively.
- `eventOps.ts`: `duplicateEventDoc` remaps household ids when guests are copied.

Tests: `householdOps.test.ts` (new) plus additions to `guestOps`, `schema` (v1 upgrade, missing
household) and `eventOps` tests.

### 2. `feat(web): upgrade stored events to the current schema on database open`

**Scrutinize. This is the one irreversible part.** This is the app's first schema bump, and local
reads (`getEventDoc`) never went through `parseEventDoc`, so existing events in IndexedDB would
have loaded without `households` and crashed. `SeatingDb` now declares
`version(EVENT_DOC_SCHEMA_VERSION).upgrade(upgradeStoredDocs)`. Dexie runs it once per database and
rewrites every stored doc through `upgradeEventDoc`.

- Future bumps get a storage migration for free (the Dexie version follows the schema version).
- A doc that fails to upgrade is logged and left as is, so one bad record can't brick the database.
- Test: `seatingDbUpgrade.test.ts` writes a real v1 record with a v1 Dexie database, then reopens
  it with `SeatingDb`.

### 3. `feat(web): seating flow with household check and overflow prompt`

- `guests/store/seatingFlowStore.ts`: read `requestSeating` → `seat` → `settle`.
  `placeOverflowAt` skips the household check on purpose: those guests already passed it, or the
  user chose "Only these".
- `guests/components/seating/*`: one component per file. `OverflowPrompt` hides itself when the
  selection no longer matches the leftovers (you clicked someone else). It doesn't offer a table
  where every leftover already sits, since that would be a no-op.
- `EditorCanvas.tsx`: drop and seat-click now just build a `SeatTarget` and call `requestSeating`.
- `AssignBar.tsx`: open-seat counts per table; household buttons.
- `guestStore.ts`: `assignGuestsToTable` moved out (to the flow). Added `selectRange`,
  `setGuestSelection`, household actions, and the Shift-click anchor.

### 4. `feat(web): households in the guest list, Shift-click ranges, select next N`

- `guests/lib/guestListModel.ts` (pure, tested): grouping, display order (which Shift-click ranges
  and "select next" use), and `nextUnassignedBatch`.
- `GuestList.tsx`, `HouseholdHeader.tsx`, `SelectNextControl.tsx`, `lib/selectModifiers.ts`.

### 5. `feat(web): import households from a Household / Party column`

- Aliases: `household`, `household name`, `party`, `party name`, `family`. **Header-only.** A
  headerless file's 4th column (often notes or meal) must not invent households.
- **Bug fix you should know about:** with a header row, columns it doesn't name used to be read by
  position anyway. A file with `Name,Party` put the party into `email`. Now only named columns are
  read when there's a header. Headerless files behave exactly as before.

### 6. Docs

`CLAUDE.md`, `data-model.md` (households, v2, storage upgrade), `architecture.md`,
`project-structure.md`, and this guide.

### 7–8. Follow-up from UX feedback

- `feat(web): NumberField …`: `components/NumberField.tsx` + `lib/numberInput.ts` (pure, tested)
  replace every `type="number"` input. Check `commit` only calls `onChange` on blur, Enter, arrows
  or −/+, never per keystroke. Before this, typing "12" chairs passed through 1 chair and unseated
  everyone in seats 2+. Blank → `min`, except table sizes, where blank keeps the current size
  (falling back to the 40-unit minimum would shrink the table).
- `feat(web): selection checkboxes and column labels …`: `SelectCheckbox` (stops propagation so the
  row's replace-selection click doesn't fire), `GuestColumnHeaders` (sticky, with select-all),
  `lib/guestColumns.ts` (the widths header and rows share). Household members are indented with
  padding inside the row instead of an indented list, so their RSVP column still lines up. The
  guest panel's default width went from 340 to 380px.

---

## How to test it yourself

```bash
npm run build:shared && npm run dev:web
```

1. **Migration:** open the app on a port where you already have events (5173 has your real dev
   data). They should open normally. In DevTools → Application → IndexedDB → `seating-local`, the
   docs show `schemaVersion: 2` and `households: []`.
2. Create an event, add two round tables (8 chairs each), and import a CSV like:

   ```csv
   Name,Email,Household
   Ada Lovelace,ada@x.com,Lovelace
   Byron Lovelace,,Lovelace
   Annabella Lovelace,,Lovelace
   Grace Hopper,,Hopper
   Walter Hopper,,Hopper
   Alan Turing,,
   Linus Torvalds,,
   Katherine Johnson,,
   Dorothy Vaughan,,
   Mary Jackson,,
   Ken Thompson,,Thompson
   Bonnie Thompson,,Thompson
   Corey Thompson,,Thompson
   Dana Thompson,,Thompson
   Evan Thompson,,Thompson
   ```

3. **Overflow:** set "Select next" to 10 and click it, then Assign to table → Table 1. 8 are seated
   (households whole), 2 stay selected, and the prompt appears. Click Table 2 in the prompt.
4. **Household kept whole + split offer:** click the Thompson header, ⌘-click the Lovelace header,
   and assign to the table with fewer seats left than 8. Thompson goes in, Lovelace is held back,
   and the prompt offers **Split household here** and **+N chairs**. Try both.
5. **Asking first:** click one Lovelace (just the row) and drag them onto a different table. The
   household question appears. Try **Only Ada** onto a full table: the overflow label reads **Keep
   current seats**.
6. **List:** Shift-click a range, ⌘-Shift-click to extend, rename a household (✎), Ungroup it, then
   select two guests and **Group as household**.
7. **Escape** closes a prompt; the selection survives.

## What was verified

- `npm run lint`, `format:check`, `typecheck`, the `@seating/web` production build and
  `npm audit --audit-level=high` all pass. Tests: shared **56** passed, web **51** passed.
- In the browser (`web-keyless`, :5174): a real pre-existing v1 event was upgraded on open. Steps
  3–7 above all passed, including a real HTML5 drop onto the canvas (hit-tested through Konva), and
  both stored documents passed `parseEventDoc` afterwards.
- Rolling back is safe for storage: Dexie 4 opens a database whose version is higher than the code
  declares (checked against fake-indexeddb), so the previous app still opens.

## What was not verified

- **API tests**: they need Postgres, and Docker wasn't running locally. CI runs them. The API only
  uses shared ops and the shared schema, so v2 flows through without API code changes.
- **Sync with mixed app versions** (sync is parked): a v1 client uploading to an API running this
  code is rejected (`schemaVersion` must be 2). A v1 client _pulling_ a v2 doc refuses it with
  "Update the app". Both are the intended behaviour, but untested end to end.
- **Touch**: dragging on tablets still doesn't work (HTML5 DnD). That's roadmap item 3.
- **Rollback detail**: if you roll back to the old app _and edit_, guests it creates have no
  `householdId`. The Dexie upgrade won't re-run when you come forward again, so those documents
  would fail `parseEventDoc` on backup export. That's an edge case of downgrading, not fixed.

## Decisions worth challenging

1. **What counts as a split.** Moving some members of a household when any other member would end
   up at a different table _or unseated_ triggers the question. Seating a family one by one by
   dragging asks every time until they're all at one table. That's strict, but it's what "never
   split without asking" says. Item 2 (exact placement dialog) is the intended path for
   seat-by-seat work.
2. **Unseating (⤺) a household member doesn't ask.** It's an explicit single-guest action.
3. **Greedy packing skips a household that doesn't fit and seats smaller parties after it.** The
   alternative was to stop at the first unit that doesn't fit, which preserves order but wastes
   seats.
4. **"+N chairs" only appears for auto-layout tables.** `setSeatCount` re-spreads custom layouts
   evenly, which would silently undo hand-placed chairs. (The op itself works on custom tables; the
   UI hides it.)
5. **Leftovers keep their old seat.** When an already-seated group overflows a new table, the ones
   that don't fit stay where they were rather than being unseated.
6. **Import matches household names case-insensitively, including households already in the
   event.** Re-importing a sheet adds people to the existing "Lovelace" household. Two unrelated
   "Smith" families in one sheet would need different values (for example "Smith (Bob)").
7. **"Select next N" skips declined guests** and continues after the current selection (wrapping to
   the top). It doesn't round to household boundaries. A batch that cuts a household gets the
   household question when assigned.
8. **The Dexie version is tied to the schema version.** That's simple and self-maintaining. If the
   object stores themselves ever change shape, we'd want a separate storage version.
