# Reviewing phase F: smarter seating

Roadmap 11, **seating rules**, and roadmap 20, **auto-seat** and **swap two guests**. Schema **v8**.

## What a user notices

- **Rules:** tick guests, then **More ▾ → Keep together** or **Keep apart**.
  - Rules apply in every layout and **only warn**:
    - ⚠ on the table, and "⚠ rule" under the guests;
    - **Rules ⚠n** in the totals line, opening a dialog that lists every rule as OK or broken,
      flags contradictions, and lets you delete rules;
    - a note in the confirmation after any seating move that breaks a rule.
- **Auto-seat…** (totals line): seats everyone without a seat, or only the selection, in one
  undoable step.
  - Households and "together" rules stay at one table.
  - "Apart" guests never share a table.
  - **Group by tag** is optional (e.g. "Work" and "Family" get their own tables).
  - Declined guests are skipped, and anyone with no room is listed.
- **Swap their seats** (More ▾ with exactly two guests selected).

## Review order

1. **`feat(shared): seating rules, auto-seat and swap (schema v8)`**:
   - `ruleOps.ts`:
     - `ruleProblems` per layout (via `layoutViews`);
     - `newRuleProblems` keys problems by rule and guests;
     - `contradictoryPairs`;
     - `dropGuestsFromRules`, which `removeGuest` now calls.
   - `autoSeat.ts`: **scrutinize the scoring.**
     - Groups come from union-find over households and together rules.
     - A table with an apart partner is skipped.
     - Scoring: +10 for a together partner already seated there; +5 for the same tag, and −5 for
       a different tag when grouping by tag; +1 for a table that's already started.
     - It's first-fit greedy, so it's not optimal. A group no table can hold is reported, not split.
   - `swapSeats` (via `applySeatPlan`).
   - Integrity: rule guests must exist.
   - Duplication remaps rule guest ids.
   - The v7 → v8 upgrade.
2. **`feat(web): seating rules, auto-seat and swap in the editor`**:
   - `features/rules/`;
   - `SelectionMoreMenu`;
   - the warning in `seatingFlowStore` (`ruleWarning(before)`);
   - the ⚠ in `TableNode` and `guestSubtitle`.

## Verified

- Lint, format, typecheck. Tests: shared **103** (tag grouping, apart avoidance, households,
  unplaced groups, swaps, rules), web **98**, plus e2e auto-seat → keep-apart → flagged, on all
  three projects.
- In the browser: auto-seat by tag (two tables of three), a keep-apart rule, a swap that broke it
  (Rules ⚠1, "⚠ rule · Seat 2", ⚠ on the table), and deleting the rule.

## Decisions worth challenging

1. **Rules warn; they never block.** Planners often break a rule on purpose for a moment while
   rearranging.
2. **Auto-seat is greedy, not an optimiser.** It's predictable and fast. A smarter solver could
   come later if needed.
3. **Groups are never split**, even when that would seat more people. The unplaced list tells you.
4. **Rules are event-wide** (all layouts). Problems are computed for the layout you're looking at.
