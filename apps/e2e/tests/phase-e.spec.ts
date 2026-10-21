import { expect, test } from "@playwright/test";

import { createEvent, isTabletLayout } from "./helpers";

test("add a grid of tables, then align a head table", async ({ page }) => {
  await createEvent(page, "Room");
  await page.getByRole("button", { name: "+ More ▾" }).click();
  await page.getByRole("button", { name: "Grid of tables…" }).click();
  const dialog = page.getByRole("dialog", { name: "Grid of tables" });
  await expect(dialog.getByText("10 × Round 60″ (5 ft) · 8 = 80 seats")).toBeVisible();
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
