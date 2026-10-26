import { type Page, expect, test } from "@playwright/test";

import { createEvent, isTabletLayout } from "./helpers";

// UX pass: building a room (UX-01, 03, 04, 05, 06, 07, 08, 26, 64, 72, 80).

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The open event's tables and objects as stored in IndexedDB, as footprints
 * (tables padded by their chairs, like the placement code). */
async function storedFootprints(page: Page): Promise<Box[]> {
  const eventId = page.url().split("/events/")[1].split(/[/?#]/)[0];
  return page.evaluate(async (id) => {
    const doc = await new Promise<{
      tables: {
        position: { x: number; y: number };
        size: { width: number; height: number };
        rotation: number;
      }[];
      objects: {
        kind: string;
        position: { x: number; y: number };
        size: { width: number; height: number };
      }[];
    }>((resolve, reject) => {
      const open = indexedDB.open("seating-local");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const request = open.result.transaction("events").objectStore("events").get(id);
        request.onsuccess = () => {
          resolve(request.result.doc);
          open.result.close();
        };
        request.onerror = () => reject(request.error);
      };
    });
    const box = (x: number, y: number, w: number, h: number, pad: number) => ({
      minX: x - w / 2 - pad,
      minY: y - h / 2 - pad,
      maxX: x + w / 2 + pad,
      maxY: y + h / 2 + pad,
    });
    return [
      ...doc.tables.map((t) => {
        const turned = Math.abs(t.rotation % 180) === 90;
        const [w, h] = turned ? [t.size.height, t.size.width] : [t.size.width, t.size.height];
        return box(t.position.x, t.position.y, w, h, 24);
      }),
      ...doc.objects.map((o) => box(o.position.x, o.position.y, o.size.width, o.size.height, 0)),
    ];
  }, eventId);
}

function overlapping(boxes: Box[]): number {
  let count = 0;
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      if (a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY) count += 1;
    }
  }
  return count;
}

async function properties(page: Page) {
  if (isTabletLayout(page)) {
    const toggle = page.getByRole("button", { name: "Properties", exact: true });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  }
  return page.getByRole("complementary", { name: "Properties" });
}

test("new tables and room items land in free floor", async ({ page }) => {
  await createEvent(page, "Free floor");
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button", { name: /^\+ Round/ }).click();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "+ Room item ▾" }).click();
  await page.getByRole("button", { name: "Bar", exact: true }).click();
  await page.keyboard.press("Escape");

  await expect.poll(async () => (await storedFootprints(page)).length).toBe(4);
  expect(overlapping(await storedFootprints(page))).toBe(0);
});

test("a grid lands in the middle of the screen", async ({ page }) => {
  await createEvent(page, "Grid");
  await page.getByRole("button", { name: "+ Tables ▾" }).click();
  await page.getByRole("button", { name: "Grid of tables…" }).click();
  const dialog = page.getByRole("dialog", { name: "Grid of tables" });
  await expect(dialog).toContainText("centred on your screen");
  await dialog.getByLabel("How many tables").fill("4");
  await dialog.getByLabel("Tables per row").fill("2");
  await dialog.getByRole("button", { name: "Add tables" }).click();

  // The whole room is on screen, so the middle of the screen is the middle
  // of the floor (not the top-left corner, where single tables go).
  await expect.poll(async () => (await storedFootprints(page)).length).toBe(4);
  const boxes = await storedFootprints(page);
  const minX = Math.min(...boxes.map((box) => box.minX));
  const maxX = Math.max(...boxes.map((box) => box.maxX));
  const minY = Math.min(...boxes.map((box) => box.minY));
  const maxY = Math.max(...boxes.map((box) => box.maxY));
  // A new event's floor is 16 × 10 m: its middle is (800, 500).
  expect(Math.abs((minX + maxX) / 2 - 800)).toBeLessThan(5);
  expect(Math.abs((minY + maxY) / 2 - 500)).toBeLessThan(5);
});

test("a grid with no room says it overlaps, and stays selected", async ({ page }) => {
  await createEvent(page, "Crowded");
  await page.getByRole("button", { name: /^\+ Round/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "+ Tables ▾" }).click();
  await page.getByRole("button", { name: "Grid of tables…" }).click();
  const dialog = page.getByRole("dialog", { name: "Grid of tables" });
  await dialog.getByLabel("How many tables").fill("40");
  await dialog.getByLabel("Tables per row").fill("8");
  await dialog.getByRole("button", { name: "Add tables" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "These tables overlap others. They’re selected, so drag them into place.",
  );
  await expect((await properties(page)).getByText("40 tables selected.")).toBeVisible();
});

test("too many chairs: a warning and a one-step resize", async ({ page }) => {
  await createEvent(page, "Tight");
  await page.getByRole("button", { name: /^\+ Round/ }).click();
  const panel = await properties(page);
  // Imperial (en-US): a new round is a real 48″, with sentence-case labels.
  await expect(panel.getByLabel("Diameter (in)")).toHaveValue("48");
  await expect(panel.getByText("Chair layout")).toBeVisible();
  await expect(panel.getByText(/Tight: /)).toBeHidden();

  await panel.getByLabel(/^Chairs/).fill("12");
  await panel.getByLabel(/^Chairs/).press("Enter");
  await expect(panel.getByText("Tight: a 48″ round comfortably seats 6.")).toBeVisible();
  await panel.getByRole("button", { name: /^Make it \d+″$/ }).click();
  await expect(panel.getByLabel("Diameter (in)")).not.toHaveValue("48");
  await expect(panel.getByText(/Tight: /)).toBeHidden();

  if (isTabletLayout(page)) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect((await properties(page)).getByText(/Tight: /)).toBeVisible();
});

test("menus are named for what they add, in the event's units", async ({ page }) => {
  await createEvent(page, "Units");
  const panel = await properties(page);
  await panel.getByLabel("Units").selectOption("metric");
  // "Automatic" names the locale's units (en-US: feet), not the current pick.
  await expect(panel.getByRole("option", { name: "Automatic (feet & inches)" })).toBeAttached();
  if (isTabletLayout(page)) await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "+ Tables ▾" }).click();
  await expect(page.getByRole("button", { name: "Round 120 cm · 6" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Banquet 180 × 75 cm · 6" })).toBeVisible();
});

test("ceremony + reception opens on the ceremony", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Event name").fill("Wedding");
  await dialog.getByRole("radio", { name: /Ceremony \+ reception/ }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/events\//);
  const layouts = page.getByRole("navigation", { name: "Layouts" });
  await expect(layouts.getByRole("button", { name: "Ceremony", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("the floor plan works from the keyboard", async ({ page }) => {
  await createEvent(page, "Keys");
  await page.getByRole("button", { name: /^\+ Round/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "+ Room item ▾" }).click();
  await page.getByRole("button", { name: "Stage", exact: true }).click();
  await page.keyboard.press("Escape");

  const floor = page.getByRole("group", { name: "Floor plan, 1 table" });
  await floor.focus();
  await page.keyboard.press("Tab");
  await expect(floor.getByText("Table 1, 8 chairs.", { exact: false })).toBeAttached();
  // Room items come after the tables.
  await page.keyboard.press("Tab");
  await expect(floor.getByText("Stage.", { exact: false })).toBeAttached();
  await page.keyboard.press("Shift+Tab");
  await expect(floor.getByText("Table 1, 8 chairs.", { exact: false })).toBeAttached();

  // Enter on a table opens Edit seating; Escape backs out to the floor plan.
  await page.keyboard.press("Enter");
  const placement = page.getByRole("dialog", { name: "Seat placement" });
  await expect(placement).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(placement).toBeHidden();
  await expect(floor).toBeFocused();
  // Tab selected it.
  await expect((await properties(page)).getByLabel("Name")).toHaveAttribute(
    "placeholder",
    "Table 1",
  );
});

test("Reset view keeps the selection", async ({ page }) => {
  await createEvent(page, "Zoom");
  await page.getByRole("button", { name: /^\+ Round/ }).click();
  // Selecting a table zooms to it, so Reset shows.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect((await properties(page)).getByLabel("Name")).toBeVisible();
});

test("turning an iPad re-fits the room", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await page.getByRole("button", { name: "+ New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Event name").fill("Rows");
  // A tall room (1400 × 1600): the portrait fit would cut it off in landscape.
  await dialog.getByRole("radio", { name: /^Ceremony(?! \+)/ }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/events\//);
  const minimap = page.getByRole("img", { name: /^Room overview/ });
  await expect(page.getByRole("group", { name: /^Floor plan/ })).toBeVisible();
  await expect(minimap).toBeHidden();

  await page.setViewportSize({ width: 1180, height: 820 });
  // Still the whole room: the minimap only shows when part of it is off-screen.
  await page.waitForTimeout(300);
  await expect(minimap).toBeHidden();
});
