# Reviewing the UX pass

The PR implements `docs/ux-review.md` (its first commit). All P1 findings are in, plus every P2/P3
rated S or M with a clear recommendation and the "Already known" items. Nothing from "Decisions
for the owner" was built. No schema change (still v9); shared gained pure ops and geometry
helpers, each with unit tests.

How it was built: shared groundwork first (Undo-button notices, a modal focus hook, contrast), then
seven area branches in parallel (`feat/ux-pass-{canvas,toolbar,guests,import,seating,checkin,export}`),
merged here with `--no-ff`. The merge commits name the area and its findings. Fixes found while
checking the merged result in the browser are in the last few commits.

## What a user notices

- **Nothing unseats people silently any more.** Deleting a table or cutting chairs says who lost a
  seat, with an **Undo** button. A blank Chairs box reverts instead of becoming 1. "Swap their
  seats" asks before splitting a household.
- **Undo buttons, not "Undo with ⌘Z"**, on every notice (iPad-friendly).
- **The guest list comes first:** search sits right under the counts, "+ Add guest" and "Import ▾"
  share one row, and the selection bar only appears (docked at the bottom) once someone is ticked.
  At 1280×800 all seven unassigned sample guests are visible (the review saw 2). Phone rows are
  about 60 px.
- **New tables, grids and room items land on empty floor**, not on top of other tables.
- **Visible selection tools:** Select ▾ (Select several with a box drag, Select all, Clear), Copy,
  and Paste (n) in the toolbar. Copying says what was copied.
- **Check-in:** searching finds people who have already arrived (and offers a walk-in only when
  nobody matches); a check-in stays on screen for 5 s with Undo. Clear all is in a ⋯ menu.
- **Import keeps partners** from party-per-row exports, previews every row, marks duplicates in
  place with "Import anyway", and warns about columns that won't be imported.
- **Print:** pick the layout for every print kind; the seating chart is a sharp vector drawing
  with readable table names, optional names at chairs, and an optional colour legend.
- **Keyboard and screen readers:** dialogs take focus, keep Tab inside and close on Escape
  (including the placement dialog); the floor plan is reachable with Tab; RSVP is a labelled radio
  group; every page has its own title; the template picker uses arrow keys.
- **iPad:** one toolbar row in both orientations; rotating re-fits the room. **Phone:** a bottom
  bar (Guests · + Add ▾ · Select ▾ · Undo · ⋯) and a header with just ← and the title.
- **Readable in every theme:** helper text, icons, the Going/Declined pills and "Saved" reach WCAG
  AA (measured on the rendered page).

## Findings → commits

| ID      | Status      | Commit(s)                 | Notes                                                                                                                                                                                                                                                                                                  |
| ------- | ----------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UX-01   | done        | 590a9e0, 5685e86          | First free spot, scanning rows from the top-left of the visible floor, then the whole floor (40 cm aisle, chair clearance as `addTableGrid`). A grid goes in the middle of the screen (owner's call at review), kept on the floor; if it overlaps anything it stays selected with the review's notice. |
| UX-02   | done        | 81db360, c363950          | Select ▾ → Select several (click/tap toggles, box-drag on empty floor, "N selected · Done" chip), Select all, Clear. Hint in room Properties.                                                                                                                                                          |
| UX-03   | partly done | 5685e86                   | "Reset view" keeps the selection. Zoom-on-select is unchanged: that is decision **D1**.                                                                                                                                                                                                                |
| UX-04   | done        | 590a9e0, 891b93b          | "⚠ Tight: a 48″ round comfortably seats 6. [Make it N″]" (one undo step). See deviations.                                                                                                                                                                                                              |
| UX-05   | done        | 590a9e0, 891b93b          | Presets carry a short `kind`; labels are built from size + units ("Round 120 cm · 6").                                                                                                                                                                                                                 |
| UX-06   | done        | 891b93b                   | "Automatic (…)" names the locale's units.                                                                                                                                                                                                                                                              |
| UX-07   | done        | 891b93b                   | "+ Tables ▾" and "+ Room item ▾".                                                                                                                                                                                                                                                                      |
| UX-08   | done        | 891b93b, 5685e86          | "Chair layout"; a new round in an imperial event is 48″.                                                                                                                                                                                                                                               |
| UX-10   | done        | 81d5a8a                   | Chairs field reverts when left blank.                                                                                                                                                                                                                                                                  |
| UX-11   | done        | 81d5a8a                   | Undo notices for table deletes and chair cuts that unseat someone.                                                                                                                                                                                                                                     |
| UX-20   | done        | f79527a                   | Swap asks before splitting a household; notice says where both went, with Undo.                                                                                                                                                                                                                        |
| UX-21   | done        | a55041a                   | Hover/focus a table chip in the overflow prompt: the table lights up and pans into view. The prompt collapses to one line (▾/▴).                                                                                                                                                                       |
| UX-22   | done        | 9f6739c                   | "+ Keep together" / "+ Keep apart" in the Rules dialog, with an inline guest picker.                                                                                                                                                                                                                   |
| UX-23   | done        | 86000b9                   | "Only the N selected" appears only with a selection; the notice names where people went, with Undo.                                                                                                                                                                                                    |
| UX-24   | done        | 0315e89                   | "+ Add guest…" in the placement tray, applied only on Confirm.                                                                                                                                                                                                                                         |
| UX-25   | done        | 796312c                   | Layout picker on every print kind; cards default to the layout with the most tables.                                                                                                                                                                                                                   |
| UX-26   | done        | 590a9e0                   | "Ceremony + reception" opens on Ceremony.                                                                                                                                                                                                                                                              |
| UX-30   | done        | f8a8e5c, c575200, 9693e1a | All four parts. See deviations for the selection bar.                                                                                                                                                                                                                                                  |
| UX-31   | done        | aec1021, 4e59389          | Partner fields + aliases; partner joins the same household in the same import; "Type" maps to Child only when its values look like adult/child.                                                                                                                                                        |
| UX-32   | done        | aec1021, 4e59389          | The notice names up to 5 skipped duplicates with row numbers.                                                                                                                                                                                                                                          |
| UX-40   | done        | dcce4c5                   | Search covers everyone; arrived matches show in place with Undo; "Not them? Add … as a walk-in" below.                                                                                                                                                                                                 |
| UX-41   | done        | dcce4c5                   | 5 s in-place confirmation with Undo; announced via the live region; labelled header Undo on phones.                                                                                                                                                                                                    |
| UX-42   | done        | dcce4c5                   | "Clear all check-ins" moved into the header ⋯ menu (native confirm kept).                                                                                                                                                                                                                              |
| UX-50   | done        | a4f3f3a                   | `showUndoNotice`; 8 s, pauses on hover/focus.                                                                                                                                                                                                                                                          |
| UX-51   | done        | 81db360                   | "Copied 2 tables and 1 room item. Paste with ⌘V or Paste in the toolbar." (touch screens don't mention ⌘V).                                                                                                                                                                                            |
| UX-52   | done        | 6466072                   | Phone trash rows stack the buttons in a full-width join.                                                                                                                                                                                                                                               |
| UX-53   | done        | 796312c                   | Vector chart: neutral chairs, "Show names at chairs", Colour none/tag/meal + legend, table names ≥ 10 pt.                                                                                                                                                                                              |
| UX-54   | done        | 6466072                   | Plain `role="alert"` under the dashboard header; the technical reason goes to the console.                                                                                                                                                                                                             |
| UX-60   | done        | d0d4ae7, af26e99          | `useModalFocus` on every modal and the print view; placement Escape fixed.                                                                                                                                                                                                                             |
| UX-61   | done        | 107d17a, 4943b67, 59104c3 | /70 helper text, /60 icons, `text-success-strong`/`text-error-strong`, brighter Purple text, page text follows the theme.                                                                                                                                                                              |
| UX-62   | done        | d54f7f5, 7439a3b          | Radio group per guest with arrow keys.                                                                                                                                                                                                                                                                 |
| UX-63   | done        | 45ac837                   | Full-width table headings with "⌖ Show on map", 44 px on touch.                                                                                                                                                                                                                                        |
| UX-64   | done        | 582de48                   | Floor plan is a focusable group; Tab/Shift+Tab select tables then room items (dashed ring); Enter opens Edit seating.                                                                                                                                                                                  |
| UX-65   | done        | c363950, 917b3aa          | Per-page titles; the event name is an `h1`.                                                                                                                                                                                                                                                            |
| UX-66   | done        | 81db360                   | Imperial events nudge 4″ / 20″ (the step, not only the label); modifier clicks listed with their visible equivalents.                                                                                                                                                                                  |
| UX-70   | done        | 6466072                   | Roving tabindex, arrows, Home/End.                                                                                                                                                                                                                                                                     |
| UX-71   | done        | 917b3aa                   | Theme ▾ on the dashboard.                                                                                                                                                                                                                                                                              |
| UX-72   | done        | 582de48                   | The stage stays invisible until its first fit.                                                                                                                                                                                                                                                         |
| UX-80   | done        | 5685e86                   | Resize re-fits unless you zoomed or panned; otherwise keeps the centre.                                                                                                                                                                                                                                |
| UX-81   | done        | c363950, c575200, 7db8715 | One toolbar row on iPad and at 1280 (with room to spare for wider fonts); Redo and Theme in ⋯ below xl; no ⌨ on touch.                                                                                                                                                                                 |
| UX-82   | done        | 107d17a                   | Sticky column header is opaque and above rows.                                                                                                                                                                                                                                                         |
| Known-1 | done        | c363950                   | Copy and Paste (n) buttons (in Select ▾ below xl).                                                                                                                                                                                                                                                     |
| Known-2 | done        | c363950                   | Phone bottom bar. See deviations.                                                                                                                                                                                                                                                                      |
| Known-3 | done        | aec1021, 4e59389          | Hand-picked columns survive the header toggle.                                                                                                                                                                                                                                                         |
| Known-4 | done        | aec1021, 4e59389          | Scrolling preview of every row; duplicates struck through with "Import anyway".                                                                                                                                                                                                                        |
| Known-5 | partly done | 4e59389                   | Copy changed and an "N columns won't be imported" warning added. Fixtures from real Zola / Knot / Joy exports still need real files from couples.                                                                                                                                                      |
| D1–D7   | skipped     | —                         | Owner decisions (below).                                                                                                                                                                                                                                                                               |

## Where the review wasn't followed literally (and why)

- **Exact seat placement lives in Properties at every width** (UX-81 asked for below xl only).
  With Select ▾, Copy and Paste added, the desktop toolbar needed ~1420 px and wrapped to three
  rows at 1280, undoing UX-30's gain. Properties is always open on desktop, and it's an event
  setting. The add buttons also read "+ Round" / "+ Rectangle".
- **UX-04 thresholds:** the warning appears below 45 cm of table edge per chair; "comfortably seats"
  uses the review's 60 cm. With 60 cm as the trigger, every default 8-top would warn. The ⚠ is
  `text-warning`, the text isn't (orange text fails 4.5:1 in light).
- **UX-08:** an imperial round is 48″ but keeps 8 chairs; taking the preset's 6 would change the
  default everywhere.
- **UX-11:** a delete that unseats nobody shows no notice (Undo is still in the toolbar).
- **UX-01 grids:** the review asked for a free rectangle; after trying it the owner asked for
  grids to land in the middle of the screen instead. Single tables and room items still take the
  first free spot.
- **UX-21:** the prompt collapses rather than docking to the far edge.
- **UX-30 selection bar:** it is the last, `sticky bottom-0` item inside the list's scroll area,
  not an overlay with reserved padding. Same effect (ticking never moves a row) with no measuring.
  "Remove from household" moved into More ▾. The add form starts open only while the list is
  empty.
- **UX-53 chart:** drawn as SVG from the layout data (`export/lib/chartScene.ts`), not captured
  from the canvas, so any layout prints without switching to it and text is sized for paper.
  Names can overlap between tight neighbouring tables; rosters are the list view. The canvas
  capture still feeds "Chart image (PNG)" (active layout).
- **UX-66:** imperial nudges are really 4″ / 20″, not 10 cm labelled in inches.
- **Known-2:** the bar has five buttons, adding Select ▾ so Duplicate/Copy/Paste/Delete stay
  reachable on a phone; Redo is in ⋯.
- **UX-31:** a partner gets the row's RSVP and tags, not its email/phone/meal. A one-word partner
  name takes the guest's surname.

## Owner decisions still open (not built)

- **D1** zoom on select (the review recommends zooming only when small or off-screen).
- **D2** protecting local-only data (backup reminder, "Back up all events").
- **D3** a door mode for check-in.
- **D4** an optional event date (schema bump).
- **D5** editing chairs/size across a multi-selection.
- **D6** floor-plan calibration.
- **D7** collapsing the desktop Properties panel.
- Plus **Known-5's real export fixtures**, which need files from real couples.

## Review order

1. **Groundwork:** `a4f3f3a` (notice actions), `d0d4ae7` + `af26e99` (`lib/useModalFocus.ts`: it
   drives Tab itself because Safari's Tab skips buttons; radio groups count as one stop),
   `107d17a` + `4943b67` + `59104c3` (contrast; `global.css` text utilities).
2. **Shared ops** (pure, tested): `590a9e0` (`document/freeSpot.ts`, `geometry/capacity.ts`,
   `resizeTableKeepingChairs`, preset `kind`), `81d5a8a`/`f79527a` (`newlyUnseatedIds`,
   `swapSplits`).
3. **Seating safety** (`81d5a8a`…`0315e89`): `editor/lib/unseatNotices.ts`, the swap state in
   `seatingFlowStore`, `placementModel.addToTray`. Note `editorStore` ↔ `historyActions` now import
   each other (used only inside functions).
4. **Canvas** (`5685e86`, `582de48`): placement in `editorStore`, `hooks/useCanvasKeyboard.ts`,
   the fit/resize logic in `EditorCanvas`.
5. **Toolbar** (`81db360`, `c363950`, `917b3aa`, `c575200`): `SelectMenu`, `useMarqueeSelection`,
   `clipboardActions`, `PhoneBottomBar`, `ToolbarOverflowMenu`, the shared menu item lists.
6. **Guest list** (`f8a8e5c`, `d54f7f5`, `45ac837`, `9693e1a`): `GuestPanelActions`,
   `ImportMenu`, `AssignBar` placement, `RsvpControl`.
7. **Import** (`aec1021`, `4e59389`): `importMapping.ts` / `importFields.ts` and their tests.
8. **Check-in & dashboard** (`dcce4c5`, `6466072`), **export** (`796312c`).
9. **Tests:** `ux-*.spec.ts` (one per area) and the additions to `phone.spec.ts`; helpers gained
   `editorTools`, `isPhoneLayout` and `exactPlacementToggle`.

## Try it

`npm run build:shared && npm run dev:web`, then on the dashboard "Try a sample event".

1. **Silent damage:** select Table 5, clear the Chairs box and Tab away (it reverts). Press − a
   few times: a notice names who lost a seat, with Undo. Delete a table: same.
2. **Swap:** tick Marie Curie and Alan Turing → More ▾ → Swap their seats: the household question,
   then a notice saying where both went.
3. **Free floor:** "+ Round" a few times, then "+ Tables ▾ → Grid of tables…", then
   "+ Room item ▾ → Bar". Nothing lands on existing tables.
4. **Selection:** Select ▾ → Select several, tap three tables, drag a box on empty floor, then
   Copy, switch layout, Paste (n).
5. **Keyboard:** Tab into the floor plan (Tab steps through tables), Enter on a table → Edit
   seating; Tab cycles inside; Escape closes and focus returns.
6. **Guest list at 1280×800:** search is near the top; tick a guest and the bar docks at the
   bottom without moving the list.
7. **Import** a CSV with `First Name,Last Name,Partner First Name,Partner Last Name,Type` columns.
8. **Check-in** (`/events/:id/check-in` or ⋯ → Check-in on a phone): check someone in, then
   search for them.
9. **Print:** Export ▾ → Seating chart, turn on "Show names at chairs", Colour: Meal; in
   "Ceremony + reception", escort cards default to Reception.
10. Switch themes (Theme ▾, also on the dashboard), and try 820×1180 / 1180×820 / 375×812.

## What was verified

- `npm run lint`, `npm run format:check`, `npm run typecheck`, shared + web unit tests, and the full
  Playwright suite (desktop Chrome, iPad portrait and landscape, iPhone) pass on the merged branch.
- In the browser (`web-keyless`): desktop 1440×900 and 1280×800, iPad 820×1180 and 1180×820, phone
  375×812, in light and dark. Contrast was measured on rendered colours in light, dark, Black and
  Purple.
- Not verified: real iPad/iPhone hardware, a real screen reader, printing to paper (the print
  view was checked on screen), XLSX import with partner columns (CSV only).
