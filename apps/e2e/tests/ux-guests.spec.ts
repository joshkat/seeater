import { expect, test } from "@playwright/test";

import { createEvent, csvOf, guestPanel, importGuests } from "./helpers";

/** Opens the sample wedding (46 guests, most seated). */
async function openSample(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\//);
}

test("on a 1280×800 laptop the guest list comes first", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "a laptop-sized desktop window");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSample(page);
  const panel = await guestPanel(page);

  // Search sits right under the totals; the add form is one button.
  const search = panel.getByRole("searchbox", { name: "Search guests" });
  const searchTop = (await search.boundingBox())!.y;
  expect(searchTop).toBeLessThan(220);
  await expect(panel.getByRole("button", { name: "+ Add guest" })).toBeVisible();
  await expect(panel.getByLabel("Guest name")).toHaveCount(0);
  // No bulk bar until someone is ticked.
  await expect(panel.getByRole("region", { name: "Selected guests" })).toHaveCount(0);

  // Count the rows fully inside the panel. The review measured 2; the sample
  // has 7 unassigned guests, then the Seated heading.
  const panelBox = (await panel.boundingBox())!;
  const rows = await panel.locator("li.cursor-grab").evaluateAll(
    (items, bottom) =>
      items.filter((item) => {
        const box = item.getBoundingClientRect();
        return box.height > 0 && box.bottom <= bottom;
      }).length,
    panelBox.y + panelBox.height,
  );
  testInfo.annotations.push({
    type: "measured",
    description: `search box top ${Math.round(searchTop)}px, ${rows} guest rows visible`,
  });
  expect(rows).toBeGreaterThanOrEqual(7);
});

test("ticking guests docks a bar at the bottom without moving the list", async ({ page }) => {
  await createEvent(page, "Bulk bar");
  await importGuests(page, csvOf(["Ada", "Grace", "Linus"]));
  const panel = await guestPanel(page);
  const ada = panel.locator("li.cursor-grab", { hasText: "Ada" });
  const grace = panel.locator("li.cursor-grab", { hasText: "Grace" });
  const before = await grace.boundingBox();

  await panel.getByRole("checkbox", { name: "Select Ada" }).locator("..").click();
  const bar = panel.getByRole("region", { name: "Selected guests" });
  await expect(bar).toContainText("1 selected");
  await expect(
    bar.getByRole("combobox", { name: "Assign selected guests to a table" }),
  ).toBeVisible();
  await expect(bar.getByRole("button", { name: "Group", exact: true })).toBeDisabled();
  await expect(ada).toHaveClass(/border-primary/);
  expect(await grace.boundingBox()).toEqual(before);

  await panel.getByRole("checkbox", { name: "Select Grace" }).locator("..").click();
  await expect(bar).toContainText("2 selected");
  await bar.getByRole("button", { name: "Group", exact: true }).click();
  await expect(panel.getByRole("checkbox", { name: /^Select the .* household$/ })).toBeVisible();
  await bar.getByRole("button", { name: "More ▾" }).click();
  await bar.getByRole("button", { name: "Remove from household" }).click();
  await expect(panel.getByRole("checkbox", { name: /household$/ })).toHaveCount(0);

  await bar.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(bar).toHaveCount(0);
});

test("+ Add guest opens a form that keeps focus in Name", async ({ page }) => {
  await createEvent(page, "Typing a list");
  const panel = await guestPanel(page);
  // An empty list starts with the form open.
  const name = panel.getByLabel("Guest name");
  await expect(name).toBeVisible();
  await name.fill("Ada Lovelace");
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  await expect(name).toBeFocused();
  await page.keyboard.type("Grace Hopper");
  await page.keyboard.press("Enter");
  await expect(panel.locator("li.cursor-grab")).toHaveCount(2);

  await panel.getByRole("button", { name: "Done" }).click();
  await expect(name).toHaveCount(0);
  await panel.getByRole("button", { name: "+ Add guest" }).click();
  await expect(panel.getByLabel("Guest name")).toBeFocused();
});

test("Import ▾ holds the spreadsheet import and its format help", async ({ page }) => {
  await createEvent(page, "Import menu");
  const panel = await guestPanel(page);
  await panel.getByRole("button", { name: "Import ▾" }).click();
  await expect(panel.getByRole("button", { name: /From spreadsheet/ })).toBeVisible();
  await panel.getByRole("button", { name: "Spreadsheet format" }).click();
  const help = panel.getByRole("region", { name: "Spreadsheet format" });
  await expect(help).toContainText("Accepts .csv and .xlsx files");
  await help.getByRole("button", { name: "Close format help" }).click();
  await expect(help).toHaveCount(0);
});

test("the RSVP control is a labelled radio group", async ({ page }) => {
  await createEvent(page, "RSVP");
  await importGuests(page, csvOf(["Ada"]));
  const panel = await guestPanel(page);
  const group = panel.getByRole("radiogroup", { name: "RSVP for Ada" });
  await expect(group.getByRole("radio", { name: "Pending" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await group.getByRole("radio", { name: "Going" }).click();
  await page.mouse.move(0, 0); // hovering keeps it open to change again

  // Collapsed to a badge that still says whose RSVP and what it is.
  const badge = panel.getByRole("button", { name: "RSVP for Ada: Going. Change" });
  await expect(badge).toBeVisible();

  // Keyboard: focusing the badge opens the group on the checked option;
  // arrows move and choose.
  await badge.focus();
  const going = panel.getByRole("radio", { name: "Going" });
  await expect(going).toBeFocused();
  await expect(going).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  const declined = panel.getByRole("radio", { name: "Declined" });
  await expect(declined).toHaveAttribute("aria-checked", "true");
  await expect(declined).toBeFocused();
});

test("table headings in the list say they show the table on the map", async ({ page }) => {
  await openSample(page);
  const panel = await guestPanel(page);
  const heading = panel.getByRole("button", { name: /^Head table .*Show on map$/ });
  await expect(heading).toBeVisible();
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (coarse) expect((await heading.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
