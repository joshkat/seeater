# Reviewing phase G: getting started

Roadmap 14, **onboarding**; 25, **templates**; 22, **smart import**. No schema change.

## What a user notices

- **New event** opens a dialog: a name plus **Start from**, which is either Blank or one of six
  templates, each with a thumbnail:
  - wedding reception, ceremony, ceremony + reception (two layouts);
  - gala dinner, dinner party, talk or class.
- **Empty dashboard:** "Create your first event" and **Try a sample event**. The sample is a
  46-guest wedding with households, meals, a rule and most guests already seated.
  "Try a sample event" is also in the New event dialog.
- **Empty room:** a hint over the floor offers "Add a round table" or **Use a template…**. Applying a
  template is one undoable step and keeps the guest list.
- **Smart import:** see the import section below.

## Review order

1. **`feat(shared): starter templates and a sample event`** (`document/templates.ts`):
   - Each template is a function that adds tables and objects with the ordinary ops (`addTableGrid`,
     `addTableFromPreset`, `addRoomObject`), so templates can't produce anything the editor couldn't.
   - Check that `applyTemplate` replaces only the **active layout's** room (floor size, tables,
     objects). Every guest seated in that layout becomes unseated. Seating in other layouts lives in
     `layouts[i].stored` and is untouched.
   - `createSampleEvent` seats guests with `autoSeat` (group by tag). It deliberately leaves the
     last six guests out, so the totals line has something to show.
2. **`feat(web): template gallery, sample event and empty-room hint`** (`features/templates/`):
   - `templatePreviews.ts` renders each thumbnail from the template's real output, cached per
     template. The preview can't drift from what you get.
   - `EmptyRoomHint` shows only when the layout has no tables, no objects and no floor-plan image.
     The overlay is `pointer-events-none` except for the card.
3. **`test(e2e): templates, empty-room hint and sample event`**: also renames the empty-state buttons
   so they don't share accessible names with the header and toolbar ones.

## Try it

1. Clear the site data (or use a fresh port), open `/`, then **Try a sample event**.
2. **← Events → + New event**, pick **Ceremony + reception**, and check both layout tabs.
3. Make a Blank event, then **Use a template… → Dinner party**, then **Undo**.
