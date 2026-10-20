import {
  type EventDoc,
  createEventDoc,
  renameEventDoc,
  setTableLabel,
  addTable,
} from "@seating/shared";
import { describe, expect, it } from "vitest";

import {
  COALESCE_MS,
  EMPTY_HISTORY,
  HISTORY_LIMIT,
  type History,
  recordEdit,
  redo,
  undo,
} from "../lib/history";

/** Applies an edit the way documentStore does: record, then move on. */
function edit(
  state: { doc: EventDoc; history: History },
  change: (doc: EventDoc) => EventDoc,
  options: { key?: string; now: number },
) {
  const next = change(state.doc);
  return { doc: next, history: recordEdit(state.history, state.doc, options) };
}

const start = () => ({ doc: createEventDoc({ name: "v0" }), history: EMPTY_HISTORY });

describe("history", () => {
  it("undoes and redoes edits in order", () => {
    let state = start();
    state = edit(state, (d) => renameEventDoc(d, "v1"), { now: 1 });
    state = edit(state, (d) => renameEventDoc(d, "v2"), { now: 2 });

    const back = undo(state.history, state.doc)!;
    expect(back.doc.name).toBe("v1");
    const backAgain = undo(back.history, back.doc)!;
    expect(backAgain.doc.name).toBe("v0");
    expect(undo(backAgain.history, backAgain.doc)).toBeNull();

    const forward = redo(backAgain.history, backAgain.doc)!;
    expect(forward.doc.name).toBe("v1");
    expect(redo(forward.history, forward.doc)!.doc.name).toBe("v2");
  });

  it("drops the redo stack when a new edit is made", () => {
    let state = start();
    state = edit(state, (d) => renameEventDoc(d, "v1"), { now: 1 });
    const back = undo(state.history, state.doc)!;
    const branched = edit(
      { doc: back.doc, history: back.history },
      (d) => renameEventDoc(d, "other"),
      {
        now: 2,
      },
    );
    expect(redo(branched.history, branched.doc)).toBeNull();
  });

  it("coalesces rapid edits with the same key into one step", () => {
    const added = addTable(createEventDoc({ name: "x" }), {
      shape: "round",
      position: { x: 0, y: 0 },
    });
    let state = { doc: added.doc, history: EMPTY_HISTORY };
    const key = `table-label:${added.tableId}`;
    for (const [i, label] of ["H", "He", "Hea", "Head"].entries()) {
      state = edit(state, (d) => setTableLabel(d, added.tableId, label), {
        key,
        now: 100 + i * 200,
      });
    }
    expect(state.history.past).toHaveLength(1);
    expect(undo(state.history, state.doc)!.doc.tables[0].label).toBe("");

    // A pause longer than the window starts a new step.
    state = edit(state, (d) => setTableLabel(d, added.tableId, "Head!"), {
      key,
      now: 100 + 3 * 200 + COALESCE_MS + 1,
    });
    expect(state.history.past).toHaveLength(2);
  });

  it("doesn't coalesce across an undo", () => {
    let state = start();
    state = edit(state, (d) => renameEventDoc(d, "a"), { key: "k", now: 1 });
    const back = undo(state.history, state.doc)!;
    const again = edit({ doc: back.doc, history: back.history }, (d) => renameEventDoc(d, "b"), {
      key: "k",
      now: 2,
    });
    expect(again.history.past).toHaveLength(1);
  });

  it("keeps at most HISTORY_LIMIT steps", () => {
    let state = start();
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      state = edit(state, (d) => renameEventDoc(d, `v${i + 1}`), { now: i });
    }
    expect(state.history.past).toHaveLength(HISTORY_LIMIT);
    expect(state.history.past[0].name).toBe("v10");
  });
});
