import { expect, test } from "@playwright/test";

test("the read-only view finds a guest's seat on the chart", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\/[^/]+$/);
  await page.goto(`${new URL(page.url()).pathname}/view`);

  await expect(page.getByRole("heading", { name: "Sample wedding" })).toBeVisible();
  await expect(page.getByText("View only")).toBeVisible();
  const chart = page.getByRole("img", { name: /^Seating chart/ });
  await expect(chart).toBeVisible();
  await expect(chart.getByText("Head table")).toBeVisible();

  await page.getByRole("searchbox", { name: "Guest name" }).fill("lovelace");
  const results = page.getByRole("list", { name: "Search results" });
  await expect(results.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("3 guests found.")).toBeVisible();
  const ada = results.getByRole("button", { name: /Ada Lovelace/ });
  await expect(ada).toContainText("Head table · seat 5");
  await ada.click();
  await expect(ada).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("chart-highlight")).toBeVisible();

  // Zooming is reachable without gestures.
  const before = await chart.getAttribute("viewBox");
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(chart).not.toHaveAttribute("viewBox", before ?? "");
  await page.getByRole("button", { name: "Fit the whole chart" }).click();

  await page.getByRole("searchbox", { name: "Guest name" }).fill("nobody here");
  await expect(page.getByText("No guest called “nobody here”.")).toBeVisible();

  // Print views come from the export feature.
  await page.getByRole("button", { name: "Print ▾" }).click();
  await page.getByRole("button", { name: "Table rosters…" }).click();
  const print = page.getByRole("dialog", { name: "Print" });
  await expect(print.getByText("Sample wedding — table rosters")).toBeVisible();
  await print.getByRole("button", { name: "Close" }).click();
  await expect(print).toBeHidden();

  await page.getByRole("link", { name: "← Editor" }).click();
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
});

test("the read-only view has a tab per layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Event name").fill("Two rooms");
  await dialog.getByRole("radio", { name: /Ceremony \+ reception/ }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/events\/[^/]+$/);
  await page.goto(`${new URL(page.url()).pathname}/view`);

  const tabs = page.getByRole("tablist", { name: "Layouts" });
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  // Opens on the dinner (the layout with the most tables), like the printed board.
  await expect(tabs.getByRole("tab", { selected: true })).toHaveText("Reception");
  await expect(page.getByRole("img", { name: "Seating chart — Reception" })).toBeVisible();
  await tabs.getByRole("tab", { name: "Ceremony" }).click();
  await expect(tabs.getByRole("tab", { name: "Ceremony" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("img", { name: "Seating chart — Ceremony" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Seating chart — Ceremony" }).getByText("Altar"),
  ).toBeVisible();
});

test("an event that isn't stored here says so", async ({ page }) => {
  await page.goto("/events/not-an-event/view");
  await expect(page.getByText("This event isn’t on this device")).toBeVisible();
});
