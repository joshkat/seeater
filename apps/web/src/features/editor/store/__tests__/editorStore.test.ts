import { createEventDoc, occupiedRects } from "@seating/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { createEvent } from "../../../storage/repository/eventRepository";
import { activeDb } from "../../../storage/store/storageStore";
import { useDocumentStore } from "../documentStore";
import { useEditorStore } from "../editorStore";

const editor = () => useEditorStore.getState();
const doc = () => useDocumentStore.getState().doc!;

beforeEach(async () => {
  await useDocumentStore.getState().close();
  const event = createEventDoc({ name: "Room" });
  await createEvent(activeDb(), event);
  await useDocumentStore.getState().open(event.id);
  editor().resetForNewEvent();
  useEditorStore.setState({ stageSize: { width: 0, height: 0 } });
  editor().setStageSize({ width: 800, height: 500 });
  editor().fitToView();
});

describe("adding items", () => {
  it("puts each new table and object in free floor", () => {
    for (let i = 0; i < 5; i += 1) editor().addTable("round");
    editor().addRoomObject("bar");
    const rects = occupiedRects(doc());
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY;
        expect(apart).toBe(true);
      }
    }
  });

  it("centres a grid on the screen, wherever the view is", () => {
    // Zoom in, then pan so the screen shows the floor's top-left area.
    editor().zoomBy(2);
    const { scale } = editor().viewport;
    editor().setViewport({ scale, x: -200 * scale, y: -100 * scale });
    const view = { x: 200 + 400 / scale, y: 100 + 250 / scale };
    editor().addTableGrid({ count: 4, columns: 2, shape: "round" });
    const added = doc().tables.filter((table) => editor().selectedIds.includes(table.id));
    const mean = (pick: (point: { x: number; y: number }) => number) =>
      added.reduce((sum, table) => sum + pick(table.position), 0) / added.length;
    expect(mean((point) => point.x)).toBeCloseTo(view.x);
    expect(mean((point) => point.y)).toBeCloseTo(view.y);
  });

  it("reports when a grid has no room and overlaps", () => {
    expect(editor().addTableGrid({ count: 4, columns: 2, shape: "round" })).toBe(true);
    expect(editor().addTableGrid({ count: 100, columns: 10, shape: "round" })).toBe(false);
    expect(editor().selectedIds).toHaveLength(100);
  });
});

describe("the view", () => {
  it("keeps the selection on Reset view", () => {
    editor().addTable("round");
    const [id] = editor().selectedIds;
    editor().zoomBy(2);
    editor().resetView();
    expect(editor().selectedIds).toEqual([id]);
  });

  it("re-fits on resize while untouched, else keeps the centre", () => {
    editor().setStageSize({ width: 500, height: 800 });
    expect(editor().viewport).toBe(editor().homeViewport);

    editor().zoomBy(2);
    const { viewport } = editor();
    const centre = {
      x: (250 - viewport.x) / viewport.scale,
      y: (400 - viewport.y) / viewport.scale,
    };
    editor().setStageSize({ width: 800, height: 500 });
    const after = editor().viewport;
    expect((400 - after.x) / after.scale).toBeCloseTo(centre.x);
    expect((250 - after.y) / after.scale).toBeCloseTo(centre.y);
    expect(after.scale).toBe(viewport.scale);
  });
});
