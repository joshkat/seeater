import { type Page, expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  closeDrawers,
  createEvent,
  importGuests,
  selectAllGuests,
} from "./helpers";

const CSV = ["Name,Meal", "Ada Lovelace,Fish", "Grace Hopper,Chicken"].join("\n");

/** Three tables (so seating auto-fills) with Ada and Grace at Table 1. */
async function seatTwo(page: Page): Promise<void> {
  await addRoundTable(page);
  await addRoundTable(page);
  await addRoundTable(page);
  await importGuests(page, CSV);
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");
  await expect(page.getByRole("status")).toHaveText("Seated 2 guests at Table 1.");
  await closeDrawers(page);
}

async function openPrint(page: Page, item: string) {
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("button", { name: `${item}…` }).click();
  return page.getByRole("dialog", { name: "Print" });
}

test("the printed chart is neutral, with optional names and a colour legend (UX-53)", async ({
  page,
}) => {
  await createEvent(page, "Chart");
  await seatTwo(page);
  const view = await openPrint(page, "Seating chart");

  const chart = view.getByRole("img", { name: "Seating chart — Main" });
  await expect(chart).toBeVisible();
  await expect(chart.getByText("Table 1", { exact: true })).toBeVisible();
  // Neutral by default: no names, no legend.
  await expect(chart.getByText("Ada", { exact: true })).toHaveCount(0);
  await expect(view.getByRole("list", { name: /Chair colours/ })).toHaveCount(0);

  await view.getByLabel("Show names at chairs").check();
  await expect(chart.getByText("Ada", { exact: true })).toBeVisible();
  await expect(chart.getByText("Grace", { exact: true })).toBeVisible();

  await view.getByRole("combobox", { name: "Colour chairs by" }).selectOption("Meal");
  const legend = view.getByRole("list", { name: "Chair colours: Meal" });
  await expect(legend.getByRole("listitem")).toHaveText(["Chicken", "Fish"]);

  // Table names print at 10 pt or more: the SVG is drawn into at least a
  // 7 × 8 in box, so font-size × (rendered width / viewBox width) ≥ 10 pt.
  const printedPt = await chart.evaluate((svg) => {
    const box = (svg as SVGSVGElement).viewBox.baseVal;
    const label = [...svg.querySelectorAll("text")].find((t) => t.textContent === "Table 1")!;
    const scale = Math.min((7 * 72) / box.width, (8 * 72) / box.height);
    return Number(label.getAttribute("font-size")) * scale;
  });
  expect(printedPt).toBeGreaterThanOrEqual(10);
});

test("print views pick a layout; cards default to the one with the most tables (UX-25)", async ({
  page,
}) => {
  await createEvent(page, "Two rooms");
  await addRoundTable(page);
  await addRoundTable(page);
  await page.getByRole("button", { name: "+ Layout" }).click();
  const dialog = page.getByRole("dialog", { name: "New layout" });
  await dialog.getByLabel("Layout name").fill("Ceremony");
  await dialog.getByRole("button", { name: "Create layout" }).click();
  await expect(dialog).toBeHidden();

  // Viewing the (empty) Ceremony layout: escort cards still start on Main.
  const view = await openPrint(page, "Escort cards");
  const layout = view.getByRole("combobox", { name: "Layout" });
  await expect(layout.locator("option:checked")).toHaveText("Main");

  // The chart starts on the layout being edited, and can show another one.
  await view.getByRole("tab", { name: "Seating chart" }).click();
  await expect(layout.locator("option:checked")).toHaveText("Ceremony");
  await expect(view.getByText("This layout has no tables yet.")).toBeVisible();
  await layout.selectOption({ label: "Main" });
  await expect(view.getByRole("img", { name: "Seating chart — Main" })).toBeVisible();

  // A layout picked by hand sticks while switching print kinds.
  await view.getByRole("tab", { name: "Table rosters" }).click();
  await expect(layout.locator("option:checked")).toHaveText("Main");

  // Closing forgets the pick.
  await view.getByRole("button", { name: "Close" }).click();
  const again = await openPrint(page, "Seating chart");
  await expect(
    again.getByRole("combobox", { name: "Layout" }).locator("option:checked"),
  ).toHaveText("Ceremony");
});
