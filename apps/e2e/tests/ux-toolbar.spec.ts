import { type Page, expect, test } from "@playwright/test";

import {
  addRoundTable,
  createEvent,
  editorTools,
  exactPlacementToggle,
  isTabletLayout,
} from "./helpers";

/** Picks an item from the toolbar's Select ▾ menu. */
async function selectMenu(page: Page, item: string): Promise<void> {
  const tools = editorTools(page);
  await tools.getByRole("button", { name: "Select ▾" }).click();
  await tools.getByRole("button", { name: item, exact: true }).click();
}

/** The Properties panel (its drawer opened below xl). */
async function properties(page: Page) {
  if (isTabletLayout(page)) {
    const toggle = page.getByRole("button", { name: "Properties", exact: true });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  }
  return page.getByRole("complementary", { name: "Properties" });
}

test("Select ▾ → Select several: drag a box on the floor, then Done", async ({ page }) => {
  await createEvent(page, "Select several");
  await addRoundTable(page);
  await addRoundTable(page);

  await selectMenu(page, "Select several");
  const chip = page.getByRole("status", { name: "Selecting several" });
  await expect(chip).toContainText("0 selected");

  // No Shift: in this mode a drag on empty floor draws a selection box.
  const canvas = (await page.locator('[data-drop-zone="canvas"]').boundingBox())!;
  await page.mouse.move(canvas.x + 60, canvas.y + 70);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2, { steps: 4 });
  await page.mouse.move(canvas.x + canvas.width - 60, canvas.y + canvas.height - 60, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(chip).toContainText("2 selected");

  await chip.getByRole("button", { name: "Done" }).click();
  await expect(chip).toBeHidden();
  await expect((await properties(page)).getByText("2 tables selected.")).toBeVisible();
});

test("Select all and Clear selection are in Select ▾", async ({ page }) => {
  await createEvent(page, "Select all");
  await addRoundTable(page);
  await addRoundTable(page);

  await selectMenu(page, "Select all");
  const panel = await properties(page);
  await expect(panel.getByText("2 tables selected.")).toBeVisible();
  await expect(panel.getByText(/use Select ▾ → Select several/)).toBeVisible();

  if (isTabletLayout(page)) await page.keyboard.press("Escape"); // closes the drawer
  await selectMenu(page, "Clear selection");
  await expect(
    (await properties(page)).getByText("To line up tables, choose Select ▾ → Select several."),
  ).toBeVisible();
});

test("Copy and Paste have visible controls and copying says so", async ({ page }) => {
  await createEvent(page, "Copy paste");
  await page.getByRole("button", { name: /^\+ Round/ }).click(); // stays selected

  if (isTabletLayout(page)) {
    // Below xl (every iPad), Copy and Paste live in Select ▾; touch has no ⌘V.
    await selectMenu(page, "Copy");
    await expect(page.getByRole("status")).toHaveText(
      "Copied 1 table. Paste from Select ▾ → Paste.",
    );
    await selectMenu(page, "Paste (1)");
  } else {
    const tools = editorTools(page);
    await tools.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(
      /^Copied 1 table\. Paste with (⌘V|Ctrl\+V) or Paste in the toolbar\.$/,
    );
    await tools.getByRole("button", { name: "Paste (1)" }).click();
  }
  await selectMenu(page, "Select all");
  await expect((await properties(page)).getByText("2 tables selected.")).toBeVisible();
});

test("the toolbar slims down below xl", async ({ page }) => {
  await createEvent(page, "Toolbar");
  const tools = editorTools(page);
  if (isTabletLayout(page)) {
    // iPad: Theme is in ⋯, there's no ⌨ on touch, Exact seat placement is in Properties.
    await expect(tools.getByRole("button", { name: "Theme" })).toHaveCount(0);
    await expect(tools.getByRole("button", { name: "Keyboard shortcuts" })).toHaveCount(0);
    await expect(tools.getByText("Exact seat placement")).toHaveCount(0);
    await tools.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "seating-dark");
    // One toolbar row in both orientations (it was three in portrait).
    expect((await tools.boundingBox())!.height).toBeLessThanOrEqual(50);
  } else {
    await expect(tools.getByRole("button", { name: "Keyboard shortcuts" })).toBeVisible();
    // Exact seat placement is in Properties, so the toolbar is one row at 1280.
    await expect(tools.getByText("Exact seat placement")).toHaveCount(0);
    await expect(await exactPlacementToggle(page)).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    expect((await tools.boundingBox())!.height).toBeLessThanOrEqual(50);
    await tools.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "seating-dark");
  }
});

test("each page has its own title and the dashboard has a theme menu", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("My events · Seating");
  await page.getByRole("button", { name: "Theme" }).click();
  await page.getByRole("button", { name: "Purple", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "synthwave");

  await createEvent(page, "Garden party");
  await expect(page).toHaveTitle("Garden party · Seating");
  await expect(page.getByRole("heading", { level: 1, name: "Garden party" })).toBeVisible();

  await page.goto("/trash");
  await expect(page).toHaveTitle("Trash · Seating");
});
