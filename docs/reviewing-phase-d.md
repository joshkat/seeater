# Reviewing phase D: export and print

Roadmap item 5: getting a seating plan out of the app.

## What a user notices

**Export ▾** in the editor header:

- **Print or save as PDF:**
  - seating chart;
  - table rosters (seat, guest, meal, needs);
  - an alphabetical **find your seat** board;
  - **fold-over place cards**;
  - **escort cards**.

  Each opens a clean print view with tabs. For the lists you can pick a layout and choose whether
  to include declined guests. **Print / Save as PDF** uses the browser's dialog.

- **Download:**
  - the chart as a **PNG**, at 2× resolution and cropped to the tables;
  - the **guest list as CSV**: every detail plus table and seat for each layout.

## How it works

- **No PDF library.** `PrintView` is a portal (`#print-view`). While it's open, `body.printing`
  and the `@media print` rule in `global.css` hide the app and the view's own toolbar, so only the
  sheet prints. That works offline and adds no dependency, and the browser handles page size and
  margins.
- **The chart image comes from the live canvas.** `EditorCanvas` registers a capture function
  (`chartCapture.ts`). It resets the view to 1:1, hides the grid and selection handles, crops to
  the tables' bounding box plus a margin, renders at `pixelRatio: 2`, then restores the view. It
  only covers the **active** layout.
- **The lists are pure:**
  - `seatingRows(doc, layoutView)` says where each guest sits in any layout;
  - `tableRosters` gives table order, then seat order;
  - `alphabetical` sorts by surname.
  - Declined guests are left out unless you ask for them.
- **The CSV** (`guestsCsv`) uses the importer's own headers. A test exports a file and imports it
  again, checking that the details survive. With several layouts it adds `Table (Layout)` /
  `Seat (Layout)` columns.

## Review order

1. `feat(web): export and print — …`: `features/export/` (lib, store, components, `print/*`), the
   capture in `EditorCanvas`, `GridLayer` (the grid lines get a name so they can be hidden), and the
   print CSS.
2. `test: e2e for export` (in the docs commit's PR): rosters, find-your-seat, the chart image, and
   CSV download contents.

## Verified

- Lint, format, typecheck, web build. Tests: web **92** (6 new for export), e2e **42** passing
  across desktop and iPad WebKit.
- In the browser:
  - the chart captures at 3200×2000 uncropped and 595×595 cropped to the tables;
  - the find-your-seat list sorts by surname;
  - six place cards rendered correctly, with the names upside down for folding.
- **Not checked:** an actual printout or PDF from the system dialog. Page breaks rely on
  `break-inside: avoid`.

## Decisions worth challenging

1. **Browser printing instead of generating PDFs.** It's simpler and works offline, but the layout
   depends a little on the browser, and there's no "download PDF" button (you use Save as PDF).
2. **Card sizes are fixed:** place cards are 2.6" tall in two columns, escort cards 1.6" in three.
   There are no paper presets or custom sizes.
3. **The chart prints the active layout only.** The other lists can use any layout.
4. **Declined guests are left out by default** in everything printed.
