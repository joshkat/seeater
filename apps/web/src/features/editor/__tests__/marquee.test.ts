import { describe, expect, it } from "vitest";

import { idsInMarquee, marqueeSelection } from "../geometry/marquee";

const items = [
  { id: "a", position: { x: 100, y: 100 } },
  { id: "b", position: { x: 300, y: 100 } },
  { id: "c", position: { x: 300, y: 400 } },
];

describe("marquee", () => {
  it("finds items whose centre is inside, whichever way it was dragged", () => {
    expect(idsInMarquee({ start: { x: 50, y: 50 }, end: { x: 350, y: 150 } }, items)).toEqual([
      "a",
      "b",
    ]);
    expect(idsInMarquee({ start: { x: 350, y: 450 }, end: { x: 250, y: 50 } }, items)).toEqual([
      "b",
      "c",
    ]);
  });

  it("adds to the selection in Select several, replaces it with Shift-drag", () => {
    expect(marqueeSelection(["a", "b"], ["b", "c"], true)).toEqual(["a", "b", "c"]);
    expect(marqueeSelection(["a"], ["b", "c"], false)).toEqual(["b", "c"]);
  });
});
