import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  createEvent,
  csvOf,
  editorTools,
  exactPlacementToggle,
  importGuests,
  isTabletLayout,
  redoControl,
  seatedCount,
  selectAllGuests,
} from "./helpers";

test("seat guests chair by chair, then undo and redo", async ({ page }) => {
  await createEvent(page, "Dinner for three");
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada", "Grace", "Linus"]));

  // One table, so "Exact seat placement" is on (auto) and the dialog opens.
  await expect(await exactPlacementToggle(page)).toBeVisible();
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");

  const dialog = page.getByRole("dialog", { name: "Seat placement" });
  await expect(dialog.getByRole("heading", { name: "Seat guests at Table 1" })).toBeVisible();
  for (const [index, name] of ["Ada", "Grace", "Linus"].entries()) {
    await dialog.getByRole("button", { name: new RegExp(name) }).click();
    await dialog.getByRole("button", { name: `Seat ${index + 1}, empty` }).click();
  }
  await expect(dialog.getByText("3 changes")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  expect(await seatedCount(page)).toBe(3);

  // The whole Confirm is one undo step.
  if (isTabletLayout(page)) await page.getByRole("button", { name: "Guests", exact: true }).click();
  await editorTools(page).getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => seatedCount(page)).toBe(0);
  await (await redoControl(page)).click();
  await expect.poll(() => seatedCount(page)).toBe(3);
});

test("guests who don't fit stay selected and can go to another table", async ({ page }) => {
  await createEvent(page, "Gala");
  await addRoundTable(page);
  await addRoundTable(page);
  // Two tables would default to exact placement; this test is about auto-fill.
  await (await exactPlacementToggle(page)).click();
  await importGuests(page, csvOf(Array.from({ length: 10 }, (_, i) => `Guest ${i + 1}`)));
  await selectAllGuests(page);
  await assignSelectionTo(page, "Table 1");

  const prompt = page.getByRole("dialog", { name: "Guests that didn't fit" });
  await expect(prompt).toContainText("2 guests didn’t fit at Table 1");
  await prompt.getByRole("button", { name: /Table 2/ }).click();
  await expect(page.getByRole("status")).toContainText("Seated 2 guests at Table 2.");
  expect(await seatedCount(page)).toBe(10);
});

test("undo works with the keyboard", async ({ page }) => {
  await createEvent(page, "Keys");
  await addRoundTable(page);
  const undo = page.getByRole("button", { name: "Undo" });
  await expect(undo).toBeEnabled();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(undo).toBeDisabled();
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(undo).toBeEnabled();
});
