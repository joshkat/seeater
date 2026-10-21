# Reviewing phase E1: the room, part 1

The first half of the room work:

- **align/distribute and table grids** (roadmap 17);
- **real units and table presets** (roadmap 18);
- **rows of chairs** for ceremonies (part of 9).

Schema **v6**. Room objects and the floor-plan image come in E2.

## What a user notices

- **+ More ▾** in the toolbar:
  - real-size presets: round 48″/60″/72″, banquet 6 ft / 8 ft (chairs on both long sides), head
    table 8 ft / 16 ft (chairs on one side), and a row of 10 chairs;
  - **Grid of tables…** (kind, how many, per row; the summary shows total seats).
- **Rows of chairs** look like a dashed strip with the name above. You seat guests in them like
  any table, and changing the chair count resizes the row.
- **With several tables selected**, Properties shows **Align** (six ways) and **Distribute**
  (needs three or more).
- **With nothing selected**, Properties shows **event settings**: units (automatic by locale,
  metric, or imperial) and room width and depth. Table sizes now show in cm or inches.

## Review order

1. **`feat(shared): table presets, rows of chairs, align/distribute, table grids, units (schema
v6)`**.
   - `geometry/constants.ts`: `TABLE_PRESETS` and row helpers.
   - `seatLayout.ts`: `rowSeatOffsets` and `sideSeatOffsets`.
   - `tableOps.ts`:
     - `tableBounds` is rotation-aware;
     - `alignTables`;
     - `distributeTables` uses equal gaps between footprints, not between centres;
     - `addTableGrid` is one edit, centred, and accounts for chair room;
     - `setSeatCount` resizes rows.
   - `eventOps.ts`: `setUnitSystem`, `setFloorSize`.
   - The v5 → v6 upgrade.
2. **`feat(web): table presets, chair rows, grids, align/distribute, units and floor size`**.
   - `editor/lib/units.ts` (tested).
   - `room/AddTableMenu` + `TableGridDialog`.
   - `TableShapeNode` / `TableNode` for rows.
   - **PropertiesPanel is split** into `properties/{SingleTableEditor, MultiTableEditor,
EventSettings}`. The inline `SingleTableEditor` broke the one-component-per-file rule.

## Verified

- Lint, format, typecheck. Tests: shared **88**, web **94**, e2e **48** (desktop + iPad WebKit).
- In the browser:
  - units auto-resolved to feet in en-US (52 × 33 ft room);
  - the grid added 10 × 60″ rounds (80 seats);
  - the head table shows 96 × 30 in;
  - the row hides its size fields;
  - exact placement switched off automatically past two tables.

## Decisions worth challenging

1. **Plan units = centimetres.** The old defaults already matched: 120-unit tables (about 4 ft)
   on a 1600 × 1000 floor (16 × 10 m), so existing events keep sensible real sizes.
2. **"Auto" units follow the browser locale** (imperial for en-US). The event can override it.
3. **Inputs use whole numbers** (cm or inches for tables, m or ft for the room). There are no
   fractions, which suits event planning.
4. **Rows reuse tables:** a row is a table with no body. Seating, placement, stats and export all
   work on it unchanged. A new row is still named "Table N" until you rename it.
5. **Banquet and head tables use custom chair offsets**, so editing their chairs behaves like any
   custom layout. Changing the chair count re-spaces them all around the table.
