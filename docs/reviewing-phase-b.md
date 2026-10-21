# Reviewing phase B: the data model

Phase B makes two core changes to the event document before the features that build on them
(stats, export, rules): **more detail per guest** (roadmap 6, schema v4) and **more than one
layout per event** (roadmap 13, schema v5).

## What a user notices

- **Guest details:** ✎ on any guest opens a dialog with name, contact, RSVP, child, meal, dietary
  needs and allergies, accessibility needs, tags and notes.
  - Meals and tags suggest what's already used in the event.
  - The row underneath shows the essentials: "Seat 3 · Fish · ⚠ Shellfish · ♿".
  - **Delete guest** moved into this dialog. It's undoable.
- **Import** reads these headed columns: Meal, Dietary / Allergies, Accessibility, Notes,
  Tags / Group / Side, and Child / Age group.
- **Layouts:** tabs over the canvas, starting with "Main".
  - **+ Layout** creates a blank one, one with a copy of the tables, or one with the tables and
    seating.
  - Each layout has its own tables and seating, and the guest list is shared.
  - The active tab's ⋯ menu offers Rename, Duplicate and Delete.
- **Escape** now closes an open drawer on tablets.

## Review order

1. **`feat(shared): guest details …` (v4).**
   - `schema.ts` (new fields and limits) and `migrate.ts` (the 3 → 4 step).
   - `guestOps.ts`:
     - `cleanTags` dedupes case-insensitively and caps at 20;
     - `canonical` reuses an existing spelling, so "chicken" joins "Chicken" (including earlier
       rows of the same import);
     - `mealOptions` / `tagOptions`.
2. **`feat(web): import guest details …`**: header aliases and `looksLikeChild` in `csv.ts`.
3. **`feat(web): guest details dialog …`**:
   - `guests/components/details/*`: a form keyed by guest, and Save as one `updateGuest` (one
     undo step).
   - `guestSubtitle.ts`.
   - The row's × became ✎.
4. **`feat(shared): multiple layouts per event (schema v5)`**. **Scrutinize: the design choice.**
   - The active layout stays in the top-level fields, and the others are in `layouts[].stored`.
     That keeps every existing op, screen and test untouched, at the cost of a swap on switch.
   - `integrity.ts` → `checkLayouts`: exactly one active layout, ids unique across layouts, and
     stored seating that's valid.
   - `layoutOps.ts`: pack/unpack, `addLayout` with fresh ids, and `deleteLayout` handing over.
   - `removeGuest` and `duplicateEventDoc` now cover stored layouts.
   - The 4 → 5 upgrade uses the fixed id `"main"`, so two devices upgrading the same event agree.
5. **`feat(web): layout tabs …`**:
   - `layoutActions.ts`: switching resets the view and keeps the guest selection.
   - `LayoutTabs` / `LayoutTab` / `NewLayoutDialog`.
   - The generic "any modal open → shortcuts off" guard.
6. **`test: e2e for guest details and layouts …`**.

## Verified

- Lint, format, typecheck, web build. Tests: shared **77**, web **80**, e2e **25** (54/54 over two
  repeats).
- In the browser:
  - details: save, the subtitle, delete, and undo of the delete;
  - layouts: add a blank layout, add a table there, switch back (seating intact), undo a switch.

## Decisions worth challenging

1. **Layouts share guests but not seating.** Per the plan default: a ceremony and a reception
   seat the same people differently.
2. **The active layout lives in the top-level fields.** Alternatives were moving everything into
   `layouts[]` (a large refactor touching every op) or keeping per-layout seating on the guest. If
   it ever feels awkward, the move is contained in `layoutOps.ts`.
3. **Switching layouts is an undo step.** ⌘Z right after switching takes you back to the previous
   layout. That's predictable, but it's not "undo my last edit".
4. **Meals and tags have no separate settings list.** They're whatever guests use, matched
   case-insensitively. A fixed menu could come later.
5. **The dashboard counts only the active layout's tables and seated guests.**
6. **Delete guest moved from the row into the details dialog**, so it's harder to do by accident.
   It's still undoable.
