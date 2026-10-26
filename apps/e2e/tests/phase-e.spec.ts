import { expect, test } from "@playwright/test";

import { createEvent, isTabletLayout, redoControl } from "./helpers";

test("add a grid of tables, then align a head table", async ({ page }) => {
  await createEvent(page, "Room");
  await page.getByRole("button", { name: "+ Tables ▾" }).click();
  await page.getByRole("button", { name: "Grid of tables…" }).click();
  const dialog = page.getByRole("dialog", { name: "Grid of tables" });
  await expect(dialog.getByText("10 × Round 60″ · 8 = 80 seats")).toBeVisible();
  await dialog.getByRole("button", { name: "Add tables" }).click();

  if (isTabletLayout(page))
    await page.getByRole("button", { name: "Properties", exact: true }).click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  await expect(properties.getByText("10 tables selected.")).toBeVisible();
  await properties.getByRole("button", { name: "Align top edges" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
});

test("event units and room size", async ({ page }) => {
  await createEvent(page, "Units");
  if (isTabletLayout(page))
    await page.getByRole("button", { name: "Properties", exact: true }).click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  await properties.getByLabel("Units").selectOption("metric");
  await expect(properties.getByText("Room width (m)")).toBeVisible();
  await expect(properties.getByLabel("Room width (m)")).toHaveValue("16");
  await properties.getByLabel("Units").selectOption("imperial");
  await expect(properties.getByLabel("Room width (ft)")).toHaveValue("52");
});

// A valid 1×1 PNG, enough to exercise the upload path.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("room objects are added, edited and deleted (undoably)", async ({ page }) => {
  await createEvent(page, "Objects");
  await page.getByRole("button", { name: "+ Room item ▾" }).click();
  await page.getByRole("button", { name: "Dance floor" }).click();

  if (isTabletLayout(page))
    await page.getByRole("button", { name: "Properties", exact: true }).click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  await properties.getByLabel("Label").fill("Dance!");
  await properties.getByRole("button", { name: "Delete dance floor" }).click();
  await expect(properties.getByLabel("Units")).toBeVisible();
  if (isTabletLayout(page)) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(await redoControl(page)).toBeEnabled();
});

test("a floor-plan image can be uploaded and removed", async ({ page }) => {
  await createEvent(page, "Plan");
  if (isTabletLayout(page))
    await page.getByRole("button", { name: "Properties", exact: true }).click();
  const properties = page.getByRole("complementary", { name: "Properties" });
  await properties.getByLabel("Floor plan image file").setInputFiles({
    name: "plan.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(properties.getByLabel("Floor plan image opacity")).toHaveValue("50");
  await properties.getByRole("button", { name: "Remove" }).click();
  await expect(properties.getByRole("button", { name: "Upload image" })).toBeVisible();
});
