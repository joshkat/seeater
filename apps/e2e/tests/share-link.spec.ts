import { expect, test } from "@playwright/test";

/**
 * The public read-only link (`/s/:token`). The e2e build has no sync API, so
 * the API is mocked: the document is the sample event, read back out of this
 * browser's IndexedDB. Sharing itself (invites, roles, the edit lock) is
 * covered by apps/api's integration tests and the web unit tests.
 */

const TOKEN = "e2e-token-0123456789abcdefghijklmnopqrstuv";

async function sampleDoc(page: import("@playwright/test").Page): Promise<unknown> {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample event" }).first().click();
  await page.waitForURL(/\/events\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/").pop();
  return page.evaluate(
    (eventId) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("seating-local");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const read = open.result.transaction("events").objectStore("events").get(eventId!);
          read.onsuccess = () => resolve(read.result.doc);
          read.onerror = () => reject(read.error);
        };
      }),
    id,
  );
}

test("a share link shows the chart read-only, without signing in", async ({ page }) => {
  const doc = await sampleDoc(page);
  await page.route(`**/api/shared/${TOKEN}`, (route) =>
    route.fulfill({
      json: {
        id: (doc as { id: string }).id,
        version: 3,
        updatedAt: new Date().toISOString(),
        ownerName: "Olive Owner",
        data: doc,
      },
    }),
  );

  await page.goto(`/s/${TOKEN}`);

  await expect(page.getByRole("heading", { name: "Sample wedding" })).toBeVisible();
  await expect(page.getByText("Shared by Olive Owner · read-only")).toBeVisible();
  await expect(page.getByRole("img", { name: /^Seating chart/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Guest name" }).fill("ada lovelace");
  await expect(
    page
      .getByRole("list", { name: "Search results" })
      .getByRole("button", { name: /Ada Lovelace/ }),
  ).toContainText("Head table");
  // Nothing to edit: no editor toolbar, no Share.
  await expect(page.getByRole("group", { name: "Editor tools" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
});

test("a link that was turned off says so", async ({ page }) => {
  await page.route("**/api/shared/**", (route) =>
    route.fulfill({ status: 404, json: { statusCode: 404, message: "Event not found" } }),
  );
  await page.goto(`/s/${TOKEN}`);
  await expect(page.getByText("This link doesn’t work any more")).toBeVisible();
  await expect(page.getByRole("link", { name: "Make your own seating chart" })).toBeVisible();
});
