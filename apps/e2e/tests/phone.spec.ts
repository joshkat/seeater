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

// --- UX pass: check-in and trash on a phone (UX-41, UX-52) ---

test("check-in on a phone: a labelled Undo and an in-place confirmation", async ({ page }) => {
  await page.getByRole("link", { name: "Check-in" }).click();
  // The header undo says "Undo", not just ↶.
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toContainText("Undo");
  // The title has a line of its own.
  const title = page.getByRole("heading", { name: "Check-in · Sample wedding" });
  expect((await title.boundingBox())!.width).toBeGreaterThan(250);

  const guests = page.getByRole("list", { name: "Guests" });
  await guests.getByRole("button", { name: "Check in Margaret Hamilton" }).tap();
  const row = guests.getByRole("listitem").filter({ hasText: "Margaret Hamilton:" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Undo check-in for Margaret Hamilton" }).tap();
  await expect(page.getByText(/of \d+ arrived/)).toHaveText("0 of 44 arrived");
});

test("the trash on a phone keeps the event name readable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Event actions" }).click();
  await page.getByRole("button", { name: "Move to trash" }).click();
  await page.getByRole("link", { name: /Trash/ }).click();
  const name = page.getByText("Sample wedding", { exact: true });
  await expect(name).toBeVisible();
  // Restore and Delete forever sit under the text, side by side, full width.
  const nameBox = (await name.boundingBox())!;
  const restore = (await page.getByRole("button", { name: "Restore" }).boundingBox())!;
  const remove = (await page.getByRole("button", { name: "Delete forever" }).boundingBox())!;
  expect(restore.y).toBeGreaterThan(nameBox.y + nameBox.height);
  expect(Math.abs(restore.y - remove.y)).toBeLessThan(2);
  expect(restore.width + remove.width).toBeGreaterThan(page.viewportSize()!.width * 0.7);
});

// ── UX pass: guest list (UX-30) ─────────────────────────────────────────────

test("the phone guest drawer opens on search, with compact rows", async ({ page }) => {
  await page.getByRole("button", { name: "Guests", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Guests" });
  const height = page.viewportSize()!.height;

  // Search is on the first screen; the add form and bulk bar stay out of the way.
  const search = panel.getByRole("searchbox", { name: "Search guests" });
  // (The review found it at y = 787, below the fold of an 812px screen.)
  const searchTop = (await search.boundingBox())!.y;
  expect(searchTop).toBeLessThan(height * 0.6);
  expect(searchTop - (await panel.boundingBox())!.y).toBeLessThan(150);
  await expect(panel.getByLabel("Guest name")).toHaveCount(0);
  await expect(panel.getByRole("region", { name: "Selected guests" })).toHaveCount(0);

  // An unseated row keeps its RSVP on the name's line (~64px, not ~100px).
  const row = panel.locator("li.cursor-grab").first();
  const rowBox = (await row.boundingBox())!;
  expect(rowBox.height).toBeLessThanOrEqual(70);
  const rsvpBox = (await row.getByRole("button", { name: /^RSVP for / }).boundingBox())!;
  expect(rsvpBox.y).toBeLessThan(rowBox.y + 20);

  // Ticking a guest docks the bar at the bottom of the drawer.
  await row.getByRole("checkbox").locator("..").tap();
  const bar = panel.getByRole("region", { name: "Selected guests" });
  await expect(bar).toBeVisible();
  const barBox = (await bar.boundingBox())!;
  expect(barBox.y + barBox.height).toBeLessThanOrEqual(height + 1);
  expect(barBox.y + barBox.height).toBeGreaterThan(height - 80);
});
