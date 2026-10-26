import { expect, test } from "@playwright/test";

import { addRoundTable, createEvent, isTabletLayout } from "./helpers";

test("copy, paste and select all with the keyboard", async ({ page }) => {
  await createEvent(page, "Shortcuts");
  await page.getByRole("button", { name: /^\+ Round/ }).click(); // stays selected
  await page.keyboard.press("ControlOrMeta+c");
  await page.keyboard.press("ControlOrMeta+v");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("ControlOrMeta+a");

  if (isTabletLayout(page))
    await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Properties" }).getByText("2 tables selected."),
  ).toBeVisible();
});

test("the shortcut cheat sheet opens from ? and from the toolbar", async ({ page }) => {
  await createEvent(page, "Cheat sheet");
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  // The test browsers are en-US, so the event's units are feet & inches.
  await expect(dialog.getByText("Nudge the selection (4″)")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();

  // Touch screens (the iPad projects) have no ⌨ button.
  if (isTabletLayout(page)) {
    await expect(page.getByRole("button", { name: "Keyboard shortcuts" })).toHaveCount(0);
    return;
  }
  await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a minimap appears when zoomed in", async ({ page }) => {
  await createEvent(page, "Minimap");
  await addRoundTable(page);
  const minimap = page.getByRole("img", { name: /Room overview/ });
  await expect(minimap).toBeHidden();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(minimap).toBeVisible();
  await minimap.click({ position: { x: 4, y: 4 } });
  await expect(minimap).toBeVisible();
});
