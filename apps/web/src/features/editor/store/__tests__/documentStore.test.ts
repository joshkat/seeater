import { createEventDoc, renameEventDoc } from "@seating/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { createEvent } from "../../../storage/repository/eventRepository";
import { activeDb } from "../../../storage/store/storageStore";
import { useDocumentStore } from "../documentStore";

const store = () => useDocumentStore.getState();

beforeEach(async () => {
  await store().close();
});

describe("documentStore open / close", () => {
  it("keeps the event open when one route hands it to another", async () => {
    const doc = createEventDoc({ name: "Handover" });
    await createEvent(activeDb(), doc);
    await store().open(doc.id);
    store().apply((current) => renameEventDoc(current, "Renamed"));

    // The editor unmounts (close starts) and check-in mounts (open, same id).
    const closing = store().close();
    await store().open(doc.id);
    await closing;

    expect(store().status).toBe("ready");
    expect(store().doc?.name).toBe("Renamed");
    expect(store().history.past).toHaveLength(1);
  });

  it("closes when nothing reopens the event", async () => {
    const doc = createEventDoc({ name: "Leaving" });
    await createEvent(activeDb(), doc);
    await store().open(doc.id);
    await store().close();
    expect(store().status).toBe("idle");
    expect(store().doc).toBeNull();
  });
});
