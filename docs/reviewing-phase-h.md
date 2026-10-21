# Reviewing phase H: phones and the day itself

Roadmap 15, **phone layout**, and 24, **day-of check-in**. Schema **v9** adds `guest.checkedInAt`.

## What a user notices

- **Check-in** (editor header → `/events/:id/check-in`): a phone-first door list.
  - Search by name, household or tag. Each guest shows their **table and seat**.
  - **Check in**, or **Check in all N** for a household. Tap an arrival time to undo it (the
    ↶ button works too).
  - **+ Walk-in** adds someone and checks them in. A search with no results offers it directly.
  - Filters: Not arrived / Arrived / Everyone. "N of M arrived" with a progress bar.
  - Declined guests are hidden until someone searches for them. Checking someone in marks them as
    going.
  - With several layouts, **Seats from** picks the layout to read seats from.
- **Phones** (below 640px):
  - The editor header and toolbar fit in a few rows. Theme is an icon, + Rectangle is under
    - More, and Exact seat placement is in Properties.
  - The Guests drawer scrolls as a whole, and each guest row wraps so the name is readable.

## Review order

1. **`feat(shared): day-of check-in (schema v9)`** (`checkInOps.ts`):
   - `setCheckedIn` keeps the first arrival time.
   - Checking out leaves the RSVP alone.
   - `checkInCounts` counts declined guests who came anyway as expected.
   - The v8 → v9 upgrade, and duplicate clears check-ins.
2. **`feat(web): day-of check-in screen`**:
   - `checkin/lib/checkInList.ts` (pure, tested) reuses `seatingRows`, `sortName` and
     `matchesFilter`, so search behaves like the guest list.
   - **Look closely at `useOpenEvent` + the `documentStore.open()` change.** Before it, going
     editor → check-in left the page on "Loading event…": the editor's `close()` finished after
     check-in's `open()` had already skipped (same event). The new store test fails without the fix.
3. **`feat(web): phone layout for the editor`**: mostly `max-sm:` classes. Two things to check:
   - The exact-placement switch moves with `useMediaQuery` (one copy in the DOM, never two).
   - The header and toolbar now have `z-50` / `z-40` stacking layers, so their dropdowns open over
     the canvas overlays. Modals (DaisyUI, z 999) and the drag ghost are unaffected.

## Try it

1. Open the sample event, then **Check-in**. Search "curie", **Check in all 4**, then Undo.
2. Search a name that isn't there, then **Add as a walk-in**.
3. In the preview browser, use the Mobile viewport. Open the editor, then the Guests and Properties
   drawers.
