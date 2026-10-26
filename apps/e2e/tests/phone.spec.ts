import { expect, test } from "@playwright/test";

import { editorTools } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
});

test("the editor fits a phone: bottom bar, readable guest rows", async ({ page }) => {
  const { width, height } = page.viewportSize()!;

  // One bar along the bottom (UX Known-2), with nothing off the right edge.
  const bar = editorTools(page);
  const barBox = (await bar.boundingBox())!;
  expect(Math.round(barBox.y + barBox.height)).toBe(height);
  expect(barBox.height).toBeLessThanOrEqual(57);
  for (const name of ["Guests", "+ Add ▾", "Select ▾", "Undo", "More options"]) {
    const box = await bar.getByRole("button", { name, exact: true }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.x + box!.width, name).toBeLessThanOrEqual(width);
  }
  // The header keeps ← and the title; the rest moved into ⋯.
  await expect(page.getByRole("heading", { level: 1, name: "Sample wedding" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export ▾" })).toHaveCount(0);

  await bar.getByRole("button", { name: "Guests", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Guests" });
  const name = panel.getByText("Annie Easley", { exact: true });
  await name.scrollIntoViewIfNeeded();
  await expect(name).toBeVisible();
  expect((await name.boundingBox())!.width).toBeGreaterThan(40);
  await page.keyboard.press("Escape");

  // ⋯ holds Properties (with Exact seat placement), History, Check-in, Export and the theme.
  await bar.getByRole("button", { name: "More options" }).click();
  for (const item of ["History", "Seating chart…", "Dark"]) {
    await expect(page.getByRole("button", { name: item, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Check-in" })).toBeVisible();
  await page.getByRole("button", { name: "Properties", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Properties" }).getByText("Exact seat placement"),
  ).toBeVisible();
});

test("the phone bottom bar adds tables and room items, and selects several", async ({ page }) => {
  const bar = editorTools(page);
  await bar.getByRole("button", { name: "+ Add ▾" }).click();
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  // The new bar is selected; Select ▾ has the selection actions too.
  await bar.getByRole("button", { name: "Select ▾" }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();

  await bar.getByRole("button", { name: "Select ▾" }).click();
  await page.getByRole("button", { name: "Select several" }).click();
  const chip = page.getByRole("status", { name: "Selecting several" });
  await expect(chip).toContainText("1 selected");
  await chip.getByRole("button", { name: "Done" }).click();
  await expect(chip).toBeHidden();
});

test("check-in works on a phone", async ({ page }) => {
  await editorTools(page).getByRole("button", { name: "More options" }).click();
  await page.getByRole("link", { name: "Check-in" }).click();
  await expect(page).toHaveTitle("Check-in · Sample wedding");
  await page.getByLabel("Find a guest").fill("curie");
  await page.getByRole("button", { name: "Check in all 4" }).first().tap();
  await expect(page.getByText(/of \d+ arrived/)).toHaveText("4 of 44 arrived");
});
