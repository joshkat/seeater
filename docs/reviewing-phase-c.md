# Reviewing phase C: find and understand

Phase C is read-only views over the data from phase B:

- **search and filters**, with "Show on map" (roadmap 7);
- **live stats** (roadmap 8);
- **colour-coding** of chairs (roadmap 21).

Nothing here changes the event document's schema.

## What a user notices

- **Search box and Filters** over the guest list.
  - The search matches name, contact, meal, needs, notes, tags and household.
  - The filters are RSVP, seated or not, tag, meal, and needs (dietary, accessibility, children).
  - "Showing n of N · Clear filters". Select-all and "Select next" act on the matches.
- **Show on map:** zooms to the guest's table and rings their chair for a moment. Three ways in:
  Enter in the search box, "Show on map" in guest details, or a table name in the Seated list.
- **Totals:** a line in the guest panel ("12 of 40 seated · 5 still need a seat · 3 declined"),
  and **seated/chairs** under every table on the canvas (green when full).
- **Stats dialog** (per layout):
  - totals, empty chairs and children;
  - meal totals, leaving out declined guests;
  - a per-table breakdown: fill, meals, children, dietary and accessibility notes;
  - **Copy for caterer**, a plain-text per-table summary.
- **Colour chairs by** guest, tag, meal or RSVP, with a legend at the bottom-left of the canvas,
  remembered per browser.

## Review order

1. **`feat(shared): live stats …`**: `stats.ts`. `layoutStats` works on any layout through
   `layoutViews`. Declined guests count where they sit, but not in meal totals.
2. **`feat(web): guest search and filters; show a guest on the map`**:
   - `guestFilter.ts` (pure, tested);
   - `GuestList` now renders only the `visibleGuests`;
   - `editorStore.locateSeat` and the highlight ring in `ChairNode`.
3. **`feat(web): live stats …`**: `features/stats/`, `catererText` (tested), and the fill label in
   `TableNode`.
4. **`feat(web): colour chairs …`**: `chairColors.ts` (tested), `viewPrefsStore` (localStorage) and
   `ChairColorLegend`.
5. **`fix(web): the closed Filters panel no longer catches clicks …`**. The e2e suite caught this:
   a `flex` class on DaisyUI's `dropdown-content` defeated its `display: none`, leaving an
   invisible panel over the first rows. It's now a gotcha in CLAUDE.md.

## Verified

- Lint, format, typecheck, web build. Tests: shared **80**, web **86**, e2e **36** (72/72 over two
  repeats).
- In the browser: totals, search, Enter-to-locate (the ring), fill labels, colour by meal and its
  legend, and the stats dialog.

## Decisions worth challenging

1. **Colour by tag uses each guest's first tag.** A guest with several tags shows only one colour.
2. **Category colours are assigned in sorted order.** Adding a new meal alphabetically before
   others shifts their colours. The alternative, hashing, is stable but collides early.
3. **The colour mode is a per-browser view preference**, not saved in the event.
4. **Meal totals leave out declined guests**, even though they still appear in their seats.
5. **"Show on map" works only in the active layout.** A guest seated only in another layout has no
   chair here.
