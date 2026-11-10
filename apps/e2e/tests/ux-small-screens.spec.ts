import { expect, test } from "@playwright/test";

import {
  addRoundTable,
  assignSelectionTo,
  createEvent,
  csvOf,
  guestPanel,
  importGuests,
  seatedCount,
  showGuestTab,
} from "./helpers";

test("seating someone takes them off the 'To seat' tab, with Undo", async ({ page }) => {
  await createEvent(page, "Tabs");
  await addRoundTable(page);
  await addRoundTable(page);
  await addRoundTable(page);
  await importGuests(page, csvOf(["Ada", "Grace", "Linus"]));
  const panel = await guestPanel(page);
  await expect(panel.getByRole("tab", { name: /^To seat/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(panel.getByRole("tab", { name: /^To seat/ })).toContainText("3");

  await panel.getByRole("checkbox", { name: "Select Ada" }).locator("..").click();
  await assignSelectionTo(page, "Table 2");
  const notice = page.getByRole("status").filter({ hasText: "Seated Ada at Table 2." });
  await expect(notice).toBeVisible();

  // Ada is no longer in the list being worked through; she's under "Seated".
  await guestPanel(page);
  await expect(panel.getByRole("checkbox", { name: "Select Ada" })).toHaveCount(0);
  await expect(panel.getByRole("tab", { name: /^To seat/ })).toContainText("2");
  expect(await seatedCount(page)).toBe(1);
  await showGuestTab(page, "Seated");
  await expect(panel.getByRole("checkbox", { name: "Select Ada" })).toBeVisible();

  // A search finds her whichever tab is open.
  await showGuestTab(page, "To seat");
  await panel.getByLabel("Search guests").fill("ada");
  await expect(panel.getByRole("checkbox", { name: "Select Ada" })).toBeVisible();
  await panel.getByRole("button", { name: "Clear search" }).click();

  await notice.getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => seatedCount(page)).toBe(0);
});

test("adding a guest confirms it and shows the new row", async ({ page }) => {
  await createEvent(page, "Adding");
  const panel = await guestPanel(page);
  await panel.getByLabel("Guest name").fill("Zoe Park");
  await page.keyboard.press("Enter");
  await expect(panel.getByText("✓ Added Zoe Park.")).toBeVisible();
  await expect(panel.getByRole("checkbox", { name: "Select Zoe Park" })).toBeInViewport();
  await expect(panel.getByLabel("Guest name")).toBeFocused();
});

for (const size of [
  { width: 1152, height: 648 },
  { width: 960, height: 540 },
]) {
  test(`at ${size.width}×${size.height} the guest list sits beside the floor plan`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "a zoomed-in laptop window");
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByRole("button", { name: "Try a sample event" }).click();
    await page.waitForURL(/\/events\//);

    // Open without pressing anything, and nothing dims or covers the canvas.
    const panel = page.getByRole("complementary", { name: "Guests" });
    await expect(panel.getByRole("heading", { name: "Guests" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Close panel" })).toHaveCount(0);
    const panelBox = (await panel.boundingBox())!;
    const canvasBox = (await page.getByRole("group", { name: /^Floor plan/ }).boundingBox())!;
    expect(canvasBox.x).toBeGreaterThanOrEqual(panelBox.x + panelBox.width - 1);
    expect(canvasBox.width).toBeGreaterThan(size.width * 0.5);

    // The list starts high enough to show several guests.
    const rows = await panel.locator("li.cursor-grab").evaluateAll(
      (items, bottom) =>
        items.filter((item) => {
          const box = item.getBoundingClientRect();
          return box.height > 0 && box.bottom <= bottom;
        }).length,
      size.height,
    );
    expect(rows).toBeGreaterThanOrEqual(4);

    // Properties opens beside the plan too, and Guests can be put away.
    await page.getByRole("button", { name: "Properties", exact: true }).click();
    await expect(
      page.getByRole("complementary", { name: "Properties" }).getByText("Exact seat placement"),
    ).toBeVisible();
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: "Guests", exact: true }).click();
    await expect(panel).toBeHidden();
  });
}
