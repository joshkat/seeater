import { describe, expect, it } from "vitest";

import { createCoalescedWriter } from "../repository/coalescedWriter";

interface Item {
  id: string;
  value: number;
}

function deferredWrites() {
  const written: Item[] = [];
  const releases: (() => void)[] = [];
  const write = (item: Item) =>
    new Promise<void>((resolve) => {
      releases.push(() => {
        written.push(item);
        resolve();
      });
    });
  const releaseNext = async () => {
    releases.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { written, write, releaseNext };
}

describe("createCoalescedWriter", () => {
  it("writes the first value immediately and only the latest of a burst afterwards", async () => {
    const { written, write, releaseNext } = deferredWrites();
    const writer = createCoalescedWriter<Item>((item) => item.id, write);

    writer.schedule({ id: "a", value: 1 });
    writer.schedule({ id: "a", value: 2 });
    writer.schedule({ id: "a", value: 3 });
    expect(writer.isIdle()).toBe(false);

    await releaseNext();
    await releaseNext();
    await writer.flush();

    expect(written.map((item) => item.value)).toEqual([1, 3]);
    expect(writer.isIdle()).toBe(true);
  });

  it("keeps the latest value per key", async () => {
    const { written, write, releaseNext } = deferredWrites();
    const writer = createCoalescedWriter<Item>((item) => item.id, write);

    writer.schedule({ id: "a", value: 1 });
    writer.schedule({ id: "b", value: 1 });
    writer.schedule({ id: "a", value: 2 });
    for (let i = 0; i < 3; i += 1) await releaseNext();
    await writer.flush();

    expect(written).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 1 },
      { id: "a", value: 2 },
    ]);
  });

  it("reports failures and keeps draining", async () => {
    const seen: number[] = [];
    let failedFlag: boolean | null = null;
    const writer = createCoalescedWriter<Item>(
      (item) => item.id,
      async (item) => {
        if (item.value === 1) throw new Error("disk full");
        seen.push(item.value);
      },
      { onIdle: (failed) => (failedFlag = failed) },
    );
    writer.schedule({ id: "a", value: 1 });
    writer.schedule({ id: "b", value: 2 });
    await writer.flush();
    expect(seen).toEqual([2]);
    expect(failedFlag).toBe(true);
  });
});
