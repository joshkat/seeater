import { describe, expect, it } from "vitest";

import type { EventAccessState } from "../hooks/useEventAccess";
import { needsEditLock } from "../lib/editLockPolicy";

const access = (overrides: Partial<EventAccessState>): EventAccessState => ({
  role: "owner",
  ownerName: null,
  memberCount: 0,
  synced: true,
  ...overrides,
});

describe("needsEditLock", () => {
  it("locks events other people can edit or open", () => {
    expect(needsEditLock(access({ role: "editor" }), true)).toBe(true);
    expect(needsEditLock(access({ memberCount: 2 }), true)).toBe(true);
  });

  it("skips solo events, viewers, unsynced events and signed-out use", () => {
    expect(needsEditLock(access({}), true)).toBe(false);
    expect(needsEditLock(access({ role: "viewer" }), true)).toBe(false);
    expect(needsEditLock(access({ role: "editor", synced: false }), true)).toBe(false);
    expect(needsEditLock(access({ role: "editor" }), false)).toBe(false);
    expect(needsEditLock(undefined, true)).toBe(false);
  });
});
