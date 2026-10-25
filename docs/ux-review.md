# UX review: hands-on pass (2026-10-22)

How this was tested: the `web-keyless` preview (port 5174) in the built-in browser, starting from an
empty origin. I used the sample wedding, a "Ceremony + reception" event and a CSV import. Sizes:
1440×900, 1280×800, iPad 820×1180 and 1180×820, and phone 375×812 (touch emulation). Themes: light,
dark, black and purple. Contrast was measured on the real rendered colours, with alpha composited.
Every finding below comes from something done in the app. File paths are relative to
`apps/web/src/` unless they say otherwise.

**Not exercised:**

- File downloads (guest CSV, chart PNG, "Download backup"). They save files, so I left them out.
- XLSX import (CSV only).
- Real iPad or iPhone hardware, and a real screen reader. Names and roles were checked through the
  accessibility tree.

## Summary

The product is in good shape. The core loop is fast and well thought through: build a room, add
guests, seat them. Several flows are better than most commercial seating tools:

- the household prompts;
- the overflow prompt;
- the placement dialog;
- "Undo" everywhere;
- version history;
- the check-in door list.

Copy is mostly plain and friendly.

The problems fall into four groups:

1. **Silent damage.** Several one-click actions unseat or split guests without saying so (deleting
   a table, clearing a chair count, swapping seats). Undo exists, but nobody undoes what they
   didn't notice.
2. **Day-of check-in gaps.** Searching for a guest who has already arrived returns "No one
   matches" and offers to add them again as a walk-in.
3. **Density on real screens.** On a 1280×800 laptop the guest list shows 2 rows. On a phone the
   list starts below the fold.
4. **Accessibility basics.** Dialogs don't take focus, the placement dialog ignores Escape, and
   the default light theme fails contrast on secondary text and icons.

### The 10 changes that matter most

1. **UX-10 / UX-11:** stop silently unseating guests. The chair box should revert when left blank,
   and deleting a table with guests should say so and offer Undo.
2. **UX-40:** check-in search must find arrived guests and must not offer a duplicate walk-in.
3. **UX-20:** "Swap their seats" must ask before splitting a household, like every other seating
   path does.
4. **UX-60:** dialogs should move focus inside, trap it there, and close on Escape. The placement
   dialog is the worst case.
5. **UX-30:** compact the guest panel so the list is what you see first (desktop and phone).
6. **UX-61:** fix light-theme contrast for helper text, row icons, "Going" and "Saved".
7. **UX-01:** new tables, grids and room objects should land in empty floor, not on top of
   existing tables.
8. **UX-31:** import should keep the partner in "Partner First/Last Name" columns instead of
   dropping them.
9. **UX-02 / Known-1:** add visible controls for selecting several tables, select all, and
   copy/paste. This is the owner's no-hidden-modifier rule.
10. **UX-50:** undo notices need an **Undo** button, not "Undo with ⌘Z", which means nothing on an
    iPad.

---

## Findings

### First run and dashboard

**UX-70 · P3 · keyboard: template picker is a radiogroup without arrow keys**

- **Where:** New event dialog, "Start from" (`features/templates/components/TemplatePicker.tsx`).
- **What happens:** the cards are `role="radio"` inside a `radiogroup`, but all 7 are Tab stops and
  ArrowRight does nothing. Screen-reader users expect arrow keys in a radio group.
- **Fix:** use a roving tabindex. Only the checked card gets `tabIndex=0`. Arrow keys move focus
  and selection, and Home/End jump to the first and last card.
- **Effort:** S.

**UX-71 · P3 · all: the dashboard has no theme control**

- **Where:** `/` header (`features/dashboard/components/Dashboard.tsx`).
- **What happens:** the theme can only be changed from inside an event. Someone who prefers dark
  sees a bright dashboard on every launch until they open an event.
- **Fix:** add the same "Theme ▾" dropdown to the right of the dashboard header, after
  "+ New event".
- **Effort:** S.

**UX-72 · P3 · desktop: the canvas flashes unfitted on reload**

- **Where:** reload `/events/:id` (`features/editor/components/canvas/EditorCanvas.tsx`).
- **What happens:** for about 1–2 s the canvas shows at roughly 100% zoom (a giant "Bar" fills the
  view), then it fits the room. Reproduced 3 times at 1440 and 1280 wide. Konva reported a stage
  width of 0 during that time.
- **Fix:** don't draw the stage until the first measured size has produced a fitted viewport (keep
  it `invisible` until then).
- **Effort:** S.

### Building a room

**UX-01 · P1 · all: new tables, grids and room objects land on top of existing ones**

- **Where:** toolbar "+ Round table", "+ More ▾ → Grid of tables…", "Room ▾ → Bar"
  (`features/editor/store/editorStore.ts:254-270`, where position = room centre + `(n % 5) × 24`).
- **Steps:** in the "Ceremony + reception" event, add a round table, then a 10-table grid, then a
  Bar.
- **What happens:**
  - The table lands overlapping the Table 2–7 row, with chairs interleaved.
  - The grid lands centred on the dance floor, over a whole row of tables.
  - The bar lands on the new table.
  - Nothing warns about any of it.
- **Who it hurts:** couples on an iPad, who must then drag every item out of a pile. Planners
  adding 10 tables have to fix the layout by hand.
- **Fix:**
  - Place new items at the first free spot. Scan the floor in rows from the top-left of the
    _visible_ area, and use the footprint plus chair clearance (the same footprint
    `addTableGrid` uses).
  - For a grid, find a free rectangle big enough. If there isn't one, centre it as today and show
    the notice: "These tables overlap others. They're selected, so drag them into place."
- **Effort:** M.

**UX-02 · P1 · desktop, keyboard: selecting several tables is Shift-only (hidden modifier)**

- **Where:** canvas. The multi-select hint in Properties reads "Shift-click tables or Shift-drag on
  empty floor to select several." (`properties/MultiTableEditor.tsx`).
- **What happens:**
  - There is no visible way to select several tables or objects, apart from ⌘A.
  - Align and Distribute are only reachable through Shift.
  - The hint only appears once you already have several selected, so it never teaches anyone.
- **Fix:**
  - Add a **"Select ▾"** toggle to the toolbar next to Duplicate/Delete, with:
    - **Select several**: a sticky mode where a click or tap toggles a table in or out of the
      selection, and dragging on empty floor draws a marquee. Show a "Done" chip over the canvas.
    - **Select all** (⌘A).
    - **Clear selection** (Esc).
  - Show the hint in the room Properties panel when nothing is selected: "To line up tables,
    choose Select ▾ → Select several."
- **Effort:** M.

**UX-03 · P2 · desktop, iPad: selecting a table jumps the zoom**

- **Where:** a click on a table, "+ Round table", or a table heading in the guest list.
- **What happens:**
  - Adding or clicking a table zooms until it fills about half the canvas.
  - Adding a room object doesn't zoom, which is inconsistent.
  - "Reset view" also clears the selection.
  - When you are arranging many tables, each click throws away your overview.
- **Fix:**
  - Zoom only when the table is off-screen or smaller than about 60 px on screen.
  - Pan rather than zoom when it's already readable.
  - "Reset view" must keep the selection.
  - See Decisions D1.
- **Effort:** S.

**UX-04 · P2 · all: no warning when chairs don't fit**

- **Where:** Properties → Chairs.
- **What happens:** 40 chairs on a 47″ round are drawn as an overlapping ring with no hint. A real
  4 ft round seats 6.
- **Fix:**
  - When the chair count exceeds the table's comfortable capacity (perimeter ÷ about 60 cm), show
    under the field, in `text-warning`: "Tight: a 47″ round comfortably seats 6. [Make it 72″]".
  - The button resizes the table (one apply).
- **Effort:** S.

**UX-05 · P2 · all (metric users): preset names stay imperial**

- **Where:** "+ More ▾" and the Grid dialog. The names are hard-coded in
  `packages/shared/src/geometry/constants.ts:67` ("Round 48″ (4 ft) · 6").
- **What happens:** after switching Units to "Metres & centimetres", the presets still read
  "Banquet 6 ft".
- **Fix:**
  - Build the label from size and units: "Round 120 cm · 6" or "Round 48″ · 6", and
    "Banquet 180 × 75 cm · 6".
  - Keep a short `kind` name in shared, and format it in `AddTableMenu.tsx`.
- **Effort:** S.

**UX-06 · P3 · all: "Automatic (metres & cm)" describes the override, not the locale**

- **Where:** `properties/EventSettings.tsx:40`.
- **What happens:** on an en-US browser, after choosing Metres the Auto option reads "Automatic
  (metres & cm)", although Auto would mean feet.
- **Fix:** derive the label from the locale default, not from `units`.
- **Effort:** S.

**UX-07 · P2 · all: the "+ More ▾" and "Room ▾" labels are vague**

- **Where:** `Toolbar.tsx`.
- **What happens:** "+ More" means _more table types_. "Room" _adds_ things, but it has no "+" and
  reads like a settings menu.
- **Fix:** rename them "+ Tables ▾" and "+ Room item ▾", with the same menus.
- **Effort:** S.

**UX-08 · P3 · all: copy inconsistencies in Properties**

- "Chair Layout" is title case, next to "Chairs (8)" and "Floor plan image". Use "Chair layout".
- New default round shows "Diameter (in) 47". Default an imperial event to the 48″ preset, so
  numbers are round.
- **Effort:** S.

### Building the guest list

**UX-30 · P1 · desktop, phone: the guest list is pushed off-screen by permanent controls**

- **Where:** `features/guests/components/GuestPanel.tsx`, `AddGuestForm.tsx`, `ImportButton.tsx`,
  `AssignBar.tsx`.
- **What happens:**
  - At **1280×800**, the search box starts at y = 512 and only **2 guest rows** are visible (both
    declined).
  - At **375×812**, the Guests drawer's first screen is the add form, Import, and a disabled bulk
    bar. The search box sits at y = 787, below the fold.
  - Each phone row is 102 px tall, so about 5 guests fit per screen.
  - The bulk bar ("Tick guests to seat or group them", a disabled select, a disabled "Group as
    household") shows even with zero guests and zero selected.
- **Who it hurts:** planners with 150–300 guests, and anyone on a laptop or phone.
- **Fix:**
  1. Replace the always-open add form with a one-line row: `[+ Add guest] [Import ▾] [Filters]`.
     - "+ Add guest" expands the name/contact fields inline. Keep the current behaviour that
       focus stays in Name after Add, so typing a list stays fast.
     - "Import ▾" holds "From spreadsheet…" and the format help, replacing the separate `?`.
  2. Show the **AssignBar only when at least one guest is ticked**, as a sticky bar at the
     _bottom_ of the panel: "3 selected · Assign to table ▾ · Group · More ▾ · Clear". Selecting
     must not shift the list. Overlay it, and reserve bottom padding equal to its height.
  3. Put search first, under the counts line.
  4. On phones, put RSVP on the same line as the name when the name fits, aiming for a row height
     of about 64 px.
- **Effort:** M.

**UX-31 · P1 · all: import drops partners from party-per-row exports**

- **Where:** the Import guests dialog (`guests/lib/importFields.ts`, `importMapping.ts`).
- **Steps:** import a CSV with
  `Title,First Name,Last Name,Partner First Name,Partner Last Name,Type,Wedding RSVP,Rehearsal Dinner RSVP,Street Address`.
- **What happens:**
  - "Partner First Name" and "Partner Last Name" are set to **Ignore**. "Import 2 guests" brings
    in Dana Hill but not Lou Hill.
  - "Type" (values "Primary" / "Plus-one") is mapped to **Child**.
  - Nothing tells the user that half the people were left behind.
- **Fix:**
  - Add two fields: "Partner first name" and "Partner last name" (aliases: `partner first name`,
    `partner last name`, `guest 2 first name`, `plus one first name`, `+1 first name`, ...).
  - When a row has a partner, import a second guest in the same household (household name = the
    party or the last names).
  - Count them in the button ("Import 3 guests (1 partner)").
  - Drop `type` from the Child aliases. Map it only when its values look like adult/child.
- **Effort:** M. See also Known-5.

**UX-32 · P3 · all: the duplicate notice doesn't say which rows**

- **Where:** Import guests, "1 repeats a name from earlier in the file."
- **Fix:** list the names inline, up to 5: "Skipping 1 likely duplicate: Sam Lee (row 9)."
- **Effort:** S. See also Known-4.

### Seating

**UX-10 · P1 · all: clearing the Chairs box sets the table to 1 chair and unseats everyone**

- **Where:** `properties/SingleTableEditor.tsx:67-74`. It is the only size field with no
  `emptyValue`, so blank becomes `min` = 1.
- **Steps:** sample wedding, select Table 5 (8/8). Select the chair count, Backspace, Tab.
- **What happens:** the table drops to 1 chair, 7 guests are unseated ("42 → 35 seated"), and
  nothing says so. People clear the box to retype, then click elsewhere.
- **Fix:** pass `emptyValue={table.seats.length}`, so blank reverts.
- **Effort:** S.

**UX-11 · P1 · all: deleting a table, or shrinking it, unseats guests silently**

- **Where:** toolbar Delete, the Delete/⌫ key, and Chairs − (`editor/store/editorStore.ts`
  `deleteSelected`, and `setSeatCount`).
- **Steps:** select Table 3 (8 seated), then Delete.
- **What happens:** the table goes and 8 guests become unseated. There is no confirm and no notice.
- **Fix:** keep it one undoable step (no confirm dialog), but show the seating notice with a
  button:
  - "Deleted Table 3. 8 guests are unseated. [Undo]"
  - For chair reductions: "Table 5 now has 6 chairs. 2 guests are unseated (Alan Turing, Ethel
    Turing). [Undo]"
- **Effort:** S (it reuses `showNotice`, plus UX-50's button).

**UX-20 · P1 · all: "Swap their seats" splits households without asking, and gives no feedback**

- **Where:** guest list → tick Marie Curie + Alan Turing → More ▾ → Swap their seats
  (`guests/components/SelectionMoreMenu.tsx:51`).
- **What happens:**
  - Marie moves to Table 5 and Alan to the Head table. Both households are split.
  - There is no household prompt (every other seating path asks), no notice, and the selection
    clears.
- **Fix:**
  - Route the swap through the household check: "Marie Curie is in the Curie household. Pierre,
    Irène and Ève would end up apart. [Cancel] [Swap anyway]".
  - Afterwards, show: "Swapped Marie Curie (now Table 5, seat 8) and Alan Turing (now Head table,
    seat 1). [Undo]".
- **Effort:** S.

**UX-21 · P2 · desktop: the overflow prompt covers the tables it lists**

- **Where:** `guests/components/seating/OverflowPrompt.tsx`.
- **What happens:** at 1440×900, "2 guests didn't fit at Table 5, pick another table" sits over the
  bottom of the canvas, hiding Tables 7–11, which are the ones it suggests.
- **Fix:**
  - While the prompt is open, hovering or focusing a table chip highlights that table on the
    canvas (the same ring as Show on map) and pans to it if hidden.
  - Dock the prompt to the canvas edge that is furthest from the target tables, or let it
    collapse.
- **Effort:** M.

**UX-22 · P2 · all: the Rules dialog can't add a rule**

- **Where:** guest panel "Rules" (`features/rules/components/RulesDialog.tsx`).
- **What happens:** the dialog says "To add one, tick guests, then More ▾ → Keep together / Keep
  apart." and the user has to close it and find a menu.
- **Fix:**
  - Add "+ Keep together" and "+ Keep apart" buttons to the dialog.
  - Each opens an inline guest picker: a search field plus chips, at least 2 guests, then "Add
    rule". It applies `addRule` in one step.
  - Keep the More ▾ path as well.
- **Effort:** M.

**UX-23 · P3 · all: Auto-seat offers "Only the 0 selected guests"**

- **Where:** `rules/components/AutoSeatDialog.tsx`.
- **Fix:**
  - Hide the radio when nothing is selected.
  - When it's shown, name the count: "Only the 3 selected guests".
  - After running, say where people went: "Auto-seated 2 guests: Lise Meitner → Table 2, Niels
    Bohr → Table 7. [Undo]".
- **Effort:** S.

**UX-24 · P3 · all: the placement dialog can't bring in an unseated guest**

- **Where:** Edit seating on a table (`features/placement/components/PlacementTray.tsx`).
- **What happens:** "To place (0)" only holds people already in the dialog. To add someone from
  Unassigned you have to close it and start again from the list.
- **Fix:** add "+ Add guest…" in the tray. It opens a search over unseated guests and adds the
  chosen one to the tray, still applied only on Confirm.
- **Effort:** M.

### Finding guests, stats and colour

**UX-62 · P2 · screen reader: the RSVP control's state is colour-only**

- **Where:** `guests/components/RsvpControl.tsx`.
- **What happens:** hovering or focusing turns the pill into "Pending / ✓ / ✗" buttons. The current
  value is only `btn-success` / `btn-error` colour, with no `aria-pressed`. The ✓ and ✗ glyphs rely
  on their `title`.
- **Fix:**
  - Make it `role="radiogroup"` with `aria-label="RSVP for Grace Hopper"`.
  - Each option is `role="radio"`, `aria-checked`, and `aria-label` "Going", "Pending" or
    "Declined".
- **Effort:** S.

**UX-63 · P2 · touch: table headings in the list are 16 px tall**

- **Where:** the guest list "Head table • 8" heading buttons ("Show this table on the map") on
  phone and drawer.
- **What happens:** they measured 64×16 px under `pointer: coarse`, which breaks the 44 px rule.
  They are the only targets in the drawer that do.
- **Fix:** add `pointer-coarse:min-h-11` and a "⌖ Show on map" affordance, so it's clear the
  heading is a button.
- **Effort:** S.

### Layouts

**UX-25 · P2 · all: print and export ignore which layout you want**

- **Where:** Export ▾ → any print view (`features/export/components/PrintView.tsx`).
- **What happens:** the print view only has "Include declined guests". It silently uses the active
  layout (the chart is headed "Main"). In a ceremony + reception event, escort cards printed while
  viewing Ceremony show ceremony row seats.
- **Fix:**
  - When the event has more than one layout, add "Layout: [Reception ▾]" to the print toolbar.
  - Default escort, place and find-your-seat cards to the layout with the most tables. Chart and
    rosters default to the active one.
- **Effort:** S.

**UX-26 · P3 · all: "Ceremony + reception" opens on Reception**

- The second tab is active after creation, so the first thing a couple sees is the dinner room,
  not the ceremony they will set up first.
- **Fix:** open on the first layout.
- **Effort:** S.

### Undo, history and trash

**UX-50 · P2 · iPad, phone: undo notices say "Undo with ⌘Z" and have no button**

- **Where:** `editor/store/layoutActions.ts:44` (delete layout),
  `guests/components/details/GuestDetailsForm.tsx:66` (delete guest),
  `versions/lib/versionActions.ts:42` (restore). They render through `SeatingNoticeToast.tsx`.
- **What happens:** "Deleted the "Layout 2" layout. Undo with ⌘Z." Tablets have no ⌘. The
  dashboard's trash notice already does this right, with an **Undo** button.
- **Fix:**
  - Give `showNotice` an optional action: `{ label: "Undo", run: undoEdit }`.
  - Render it as `btn btn-sm` in the toast.
  - Copy: "Deleted the "Layout 2" layout. [Undo]".
  - Keep the toast for 8 s, and pause the timer on hover or focus.
  - Use this for UX-11, UX-20 and UX-23 too.
- **Effort:** S.

**UX-51 · P2 · desktop: copy gives no feedback**

- ⌘C on 11 tables and 4 objects shows nothing, so the user can't tell whether it worked.
- **Fix:** show the notice "Copied 11 tables and 4 room items. Paste with ⌘V or Paste in the
  toolbar." See Known-1.
- **Effort:** S.

**UX-52 · P3 · phone: the trash row truncates the event name**

- **Where:** `/trash` at 375 px (`dashboard/components/TrashRow.tsx`).
- **What happens:** the name shows as "Test Wed…" and the metadata wraps into a narrow column,
  because Restore and Delete forever sit inline.
- **Fix:** below `sm`, stack the buttons under the text in a full-width `join`.
- **Effort:** S.

### Export, print and backup

**UX-53 · P2 · all: the printed seating chart has no guest names, and its labels can't be read**

- **Where:** Export ▾ → Seating chart….
- **What happens:**
  - The chart is the canvas image with tiny table labels and coloured chair dots. The colours come
    from "Colour chairs by: Guest", with no legend.
  - At a letter/A4 width the table names are a few points tall.
- **Fix:**
  - Print chairs neutral by default.
  - Add a checkbox, "Show names at chairs" (initials → first names).
  - Draw table names at a minimum printed size (≥ 10 pt).
  - Add "Colour: none / tag / meal" with the legend printed under the chart.
- **Effort:** M.

**UX-54 · P2 · all: a bad backup file shows a raw developer error**

- **Where:** dashboard "Import backup" (`features/backup/components/ImportBackupButton.tsx`).
- **What happens:** importing a JSON that isn't a backup shows a small red "Missing schemaVersion"
  squeezed into the header next to "Trash". It's not announced (no `role="alert"`).
- **Fix:**
  - Show a dismissible alert under the header with `role="alert"`: "That file isn't a
    seating-chart backup. Backups end in .seating.json and come from ⋯ → Download backup on an
    event."
  - Log the technical reason to the console only.
- **Effort:** S.

### Day-of check-in

**UX-40 · P1 · phone: arrived guests can't be found, and search offers a duplicate walk-in**

- **Where:** `/events/:id/check-in` (`features/checkin/components/CheckInPage.tsx`).
- **Steps:** check in Frances Allen. With the default "Not arrived" filter, search "Frances".
- **What happens:** "No one matches "Frances"." and **"Add "Frances" as a walk-in"**. One tap
  creates a second Frances. At the door, "Did my aunt already arrive?" is a common question.
- **Fix:**
  - While a search is typed, search **everyone**, whatever the filter.
  - Show arrived matches in place: "Frances Allen · Table 4 · seat 7 · ✓ Arrived 7:42 pm" with
    "Undo check-in".
  - Offer the walk-in only when nobody at all matches.
  - With a partial match, show the walk-in button _below_ the results: "Not them? Add "Frances" as
    a walk-in".
- **Effort:** S.

**UX-41 · P1 · phone: checking someone in gives no confirmation, and the row vanishes**

- **Where:** `checkin/components/CheckInGuestRow.tsx`.
- **What happens:** tapping "Check in" removes the row from "Not arrived" at once. The only signs are
  "1 of 44 arrived" and an unlabelled ↶ icon in the top-right corner. A mis-tap at a busy door is
  easy and hard to spot.
- **Fix:**
  - Keep the row in place for 5 s in a success state: "✓ Frances Allen: Table 4, seat 7
    [Undo]", then collapse it.
  - Also announce it via the existing `aria-live` region: "Frances Allen checked in, Table 4".
  - Give the header undo a text label on phones ("↶ Undo").
- **Effort:** S.

**UX-42 · P3 · phone: "Clear all check-ins" sits right under the search results**

- It sits directly below the walk-in empty state, where staff are tapping. It does ask first (a
  native confirm), but it shouldn't be in that spot.
- **Fix:** move it to a "⋯" menu in the header.
- **Effort:** S.

### Keyboard and accessibility

**UX-60 · P1 · keyboard, screen reader: dialogs don't take focus; the placement dialog ignores Escape**

- **Where:**
  - `features/placement/components/PlacementDialog.tsx`;
  - the escape logic in `editor/hooks/useKeyboardShortcuts.ts:57-68`;
  - Auto-seat, Stats, Rules and History (`AutoSeatDialog`, `StatsDialog`, `RulesDialog`,
    `VersionHistoryDialog`);
  - the print view (`PrintView.tsx`).
- **Steps:** focus "Edit seating" and press Enter. Then press Tab, then Escape.
- **What happens:**
  - Focus stays on the trigger behind the modal.
  - Tab goes to the **Chairs field behind the open dialog**, so a keyboard user can change the
    table under the dialog.
  - **Escape does nothing.** The global handler returns early on `.modal.modal-open`, and that
    check runs _before_ the placement branch, so the placement Escape code never runs. The dialog
    also uses `modal-open`.
  - Auto-seat, Stats, Rules and History close on Escape but also leave focus outside
    (`aria-modal="true"` with no trap).
  - The cheat sheet and New layout dialogs do focus correctly. Copy what they do.
- **Fix:**
  - Add one shared hook, `useModalFocus(ref)`: on open, focus the first field or the primary
    button; trap Tab; on close, return focus to the trigger.
  - Use it in every modal.
  - In `useKeyboardShortcuts`, move the placement branch above the generic `.modal-open` return.
- **Effort:** M.

**UX-61 · P1 · light, purple, black themes: secondary text and icons fail contrast**

- Measured on rendered colours:

  | Element                                                       | Light (default) | Purple  | Black   | Dark |
  | ------------------------------------------------------------- | --------------- | ------- | ------- | ---- |
  | Helper text ("Trace tables…", "Tick guests…", column headers) | **3.4**         | **3.1** | **3.9** | 5.1  |
  | Row icons ✎ and ⤺ (non-text, needs 3)                         | **2.6**         | 3.5     | 3.5     | 3.7  |
  | "✓ Going" pill                                                | **3.0**         | 9.6     | **4.1** | 7.5  |
  | "Saved on this device"                                        | **3.3**         | 10.5    | **4.1** | 8.3  |
  | "✕ Declined" pill                                             | **4.4**         | **3.9** | 5.3     | 4.7  |
  | Guest meta ("Fish", "Seat 4")                                 | 4.7             | **4.0** | 5.3     | 6.9  |

- **Fix:**
  - Raise `text-base-content/50` to `/70` for helper text and headers.
  - Use at least `/60` for icon buttons.
  - In the light theme, darken `--color-success` text uses (badge/pill text and the save badge) to
    reach 4.5:1. Keep the fill colour and change the text token.
  - Check `--color-error` text in purple.
  - Struck-through declined names (2.4–3.7) are intentionally muted. Keep the strike and use `/70`.
  - The theme files live in the global CSS theme blocks.
- **Effort:** S.

**UX-64 · P2 · keyboard: empty tables and room objects can't be selected without a mouse**

- **What happens:** the canvas isn't focusable. A keyboard user can select a table only through its
  guest-list heading, and that heading only exists once someone is seated there (7 of 11 in the
  sample). Empty tables and every room object can only be reached with ⌘A.
- **Fix:**
  - Make the canvas container focusable, with the label "Floor plan, N tables".
  - Tab or Shift+Tab inside it cycles items, and Enter opens Edit seating. Show a visible focus
    ring on the item.
  - As an alternative, add a "Tables" list in the room Properties panel.
- **Effort:** M.

**UX-65 · P2 · screen reader, desktop: every page has the same title and the editor has no h1**

- **What happens:** the `document.title` is "Seating Chart Builder" on the dashboard, editor,
  check-in and trash. Planners with several events open in tabs can't tell them apart. The editor's
  event name is a button whose title is "Click to rename", and the page has no `h1`.
- **Fix:**
  - Set the titles to "Sample wedding · Seating", "Check-in · Sample wedding", "Trash · Seating".
  - Wrap the name button in an `h1`.
- **Effort:** S.

**UX-66 · P3 · keyboard: cheat sheet gaps**

- It says "Nudge (10 cm)" on imperial events. Use "4″ / 20″" when imperial.
- It doesn't mention Shift-click for tables, or ⌘/Shift-click in the guest list. List them, with
  their visible equivalents (UX-02).
- **Effort:** S.

### iPad and phone layout

**UX-80 · P2 · iPad: rotating doesn't re-fit the room**

- **Where:** `EditorCanvas.tsx`, after a resize.
- **Steps:** open the editor at 820×1180, then switch to 1180×820.
- **What happens:** the room stays at the portrait fit, against the left edge, with the bottom row
  of tables cut off.
- **Fix:** on a stage resize, if the user hasn't zoomed or panned since the last fit, re-fit.
  Otherwise keep the centre point.
- **Effort:** S.

**UX-81 · P2 · iPad: the toolbar wraps awkwardly**

- At 820 px, "Exact seat placement" gets a row of its own, and "Properties ⌨ Theme" a third row.
  Three toolbar rows use about 13% of the screen before the canvas. At 1180 it is still two rows.
  Real iPads also get the 44 px touch sizes, which emulation doesn't apply above 768, so it will
  wrap more there.
- **Fix:**
  - Below `xl`, move "Exact seat placement" into Properties (as on phone).
  - Move Theme into an overflow "⋯" at the end of the toolbar.
  - Drop ⌨ on coarse pointers.
- **Effort:** S. See Known-2.

**UX-82 · P3 · phone: a sticky header glitch in the Guests drawer**

- While scrolling, a row's "Pending ✓ ✗" control draws above the sticky "GUEST" column header.
- **Fix:** give the header an opaque `bg-base-100` and `z-10`.
- **Effort:** S.

---

## Keep (don't regress)

- **The household prompt** ("Marie Curie is in the Curie household… [Only Marie Curie] [Move whole
  household (4) to Table 9]"), and that drag-from-drawer closes the drawer so you can see the table.
- **The overflow prompt** with open-seat counts and "+ 2 chairs at Table 5". Leftovers stay selected.
- **The placement dialog's model:** a working copy, "Nothing changes until you confirm", chairs as
  named focusable buttons ("Seat 1, Alan Turing").
- **Import mapping:** a field picker per column, an example value under each header, First + Last
  joined, duplicate skipping, "Imported 8 guests (skipped 1 duplicate)."
- **Version history:** automatic plus named versions, an instant restore that is itself undoable,
  "Copy as new event".
- **Trash with an Undo button**, and the 30-day copy.
- **Stats** with the per-table meal and dietary breakdown and "Copy for caterer".
- **Check-in** basics: big targets, "Check in all 4", needs shown as chips ("Wheelchair, aisle
  seat"), a progress bar, and a native confirm before "Clear all check-ins".
- **The guest list doesn't shift on selection or hover.** The RSVP pill keeps a fixed 63 px width,
  and selected rows only change colour.
- **NumberFields** on room and table sizes already revert when blank. UX-10 only needs the chair
  field brought in line.
- **Visible focus rings** (2 px solid) on toolbar and header buttons, and real `<label>`s on every
  field.
- **Empty states and copy:** "No guests yet. Add one above or import a spreadsheet.", "Everyone
  has a seat 🎉", "Everything stays on this device. No account needed."
- **Templates** with real thumbnails, and the sample event.

---

## Decisions for the owner

**D1. Zoom on select.** Today a click on a table zooms to it.

- (a) Keep it as is.
- (b) Zoom only when the table is small or off-screen, and otherwise pan (UX-03).
- (c) Never zoom on a click. Zoom only from the list's "Show on map" and from double-click.
- **Recommendation: (b).** It keeps the iPad "tap to inspect" feel, and planners keep their
  overview.

**D2. Protecting local-only data.** Everything lives in one browser's storage.

- The risk: Safari on iPad can evict a website's storage after a stretch of not visiting it,
  unless the site was added to the Home Screen.
- What I saw: backups only exist as ⋯ → "Download backup" per event, and nothing ever suggests
  making one.
- Options:
  - (a) Do nothing.
  - (b) A gentle reminder on the dashboard card after about 20 edits since the last backup: "Last
    backed up: never · [Download backup]". On iPad Safari, also suggest "Add to Home Screen".
  - (c) A "Back up all events" button on the dashboard (one file).
- **Recommendation: (b) + (c).** No accounts needed.

**D3. A door mode for check-in.** "← Editor" puts the full editor one tap away from door volunteers.

- (a) Leave it.
- (b) Add a "Door mode" toggle that hides "← Editor" and every editing control until it's turned
  off with a long press or a 4-digit code set by the planner.
- **Recommendation: (b), without the code at first.** A long press on "Exit door mode" is enough to
  stop accidents.

**D4. An event date.** Events have no date, so the dashboard can't sort by date or show "in 23
days", and check-in can't suggest itself on the day.

- **Recommendation:** add an optional date in New event and on the card. This needs a schema bump.

**D5. Editing several tables at once.** With 10 tables selected, Properties offers align and
distribute only.

- Planners expect "set chairs to 10" or "rename Table 1–10" across a selection.
- **Recommendation:** add Chairs and Diameter fields to the multi-select panel, applied as one
  edit. That's a scope addition.

**D6. Floor-plan scaling.** The image "fits the room's width", so the plan's margins make true
scale hard.

- (a) Keep it.
- (b) "Calibrate": tap two points on the plan and type the real distance.
- **Recommendation: (b), later.** It matters to venues and to planners who reuse venues, but less to
  couples.

**D7. The properties panel on desktop.** It permanently takes 260 px even when nothing is selected.
At 1280 wide the canvas gets 640 px.

- **Recommendation:** collapse it to a thin rail when nothing is selected, and open it on
  selection. The room settings move behind a "Room ▾" button. This changes the navigation model.

---

## Already known: checked, with recommendations

**Known-1: copy, paste and select all have no visible control.** Confirmed: ⌘A/⌘C show no feedback
and no Paste control appears.

- Add the "Select ▾" menu from UX-02 (Select several / Select all / Clear).
- Put **Copy** next to Duplicate when something is selected.
- Show a **Paste (15)** button in the toolbar while the clipboard holds items. It also appears in
  other layouts and events.
- After copying, show the UX-51 notice.

**Known-2: the phone toolbar layout.** At 375 px, the header plus toolbar take 226 px (28% of the
screen) in three rows:

- Row 1: ←, the title.
- Row 2: Check-in, Export ▾, History, the save dot.
- Row 3: Guests, undo/redo, + Round, + More ▾, Room ▾, Properties, theme.

The theme button has no business on row 3, and "+ Round" is the least likely action on a phone.

Recommendation:

- Make it one 56 px bottom bar on phones: `Guests · Room+ ▾ (Round, More tables, Room items) ·
Undo · ⋯ (Properties, Export, History, Check-in, Theme)`.
- Keep the header to ← plus the title.
- That gives the canvas about 150 px back.

**Known-3: smart import resets a hand-edited mapping when "First row is a header" is toggled.**
Confirmed: setting "Entree" to Tags and then toggling the checkbox twice put it back to Meal.

- Keep a `userEdited` set of column indexes.
- On toggle, recompute suggestions only for columns the user hasn't touched.
- When the toggle turns the header row into data, keep the user's picks by column position.
- Effort: S.

**Known-4: the import preview shows only 5 rows.** It's fine as a preview ("…and 4 more guests").
The real problem is that duplicates beyond row 5 are invisible. Recommendation:

- Make the preview scroll inside a `max-h-64` box and show every row.
- Mark skipped duplicates in place: a struck-through row with the badge "Duplicate, skipped" and a
  per-row "Import anyway".
- This also covers UX-32.

**Known-5: the wedding-site header aliases are unverified.** Testing a party-per-row layout found
two real gaps (UX-31): partner columns are dropped, and "Type" becomes Child. Recommendation:

- Ask 2–3 real couples for their Zola, The Knot or Joy export, with names scrambled.
- Add each file as a fixture test in `importMapping` tests, and fix the aliases against them.
- Until then, change the dialog copy from "recognises common wedding-site column names" to
  "guesses each column from its header. Check them before importing."
- Show a warning when any non-empty column is set to Ignore: "2 columns won't be imported:
  Partner First Name, Street Address."
