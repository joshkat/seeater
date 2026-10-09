import type { RemoteEventSummary } from "@seating/shared";
import { describe, expect, it } from "vitest";

import type { SyncMeta } from "../../storage/db/SeatingDb";
import { type LocalSyncState, planSync } from "../engine/planSync";

const T = "2026-01-01T00:00:00.000Z";

function local(id: string, sync: Partial<SyncMeta>): LocalSyncState {
  return { id, updatedAt: T, sync: { baseVersion: 1, dirty: false, deleted: false, ...sync } };
}

function remote(id: string, version: number, deleted = false): RemoteEventSummary {
  return { id, name: id, version, deleted, updatedAt: T };
}

/** Plans a single event and returns its one action (or undefined). */
function planOne(mine: LocalSyncState | null, server: RemoteEventSummary | null) {
  const actions = planSync(mine ? [mine] : [], server ? [server] : []);
  expect(actions.length).toBeLessThanOrEqual(1);
  return actions[0];
}

describe("planSync decision table", () => {
  describe("server at our base version", () => {
    it("clean → nothing", () => {
      expect(planOne(local("a", {}), remote("a", 1))).toBeUndefined();
    });
    it("dirty → push at base", () => {
      expect(planOne(local("a", { dirty: true }), remote("a", 1))).toEqual({
        type: "push",
        id: "a",
        baseVersion: 1,
      });
    });
    it("local tombstone → delete on server", () => {
      expect(planOne(local("a", { dirty: true, deleted: true }), remote("a", 1))).toMatchObject({
        type: "deleteRemote",
        baseVersion: 1,
      });
    });
  });

  describe("server moved on", () => {
    it("clean → pull", () => {
      expect(planOne(local("a", {}), remote("a", 2))).toMatchObject({ type: "pull" });
    });
    it("dirty → keep both (fork, then pull)", () => {
      expect(planOne(local("a", { dirty: true }), remote("a", 2))).toMatchObject({
        type: "forkThenPull",
      });
    });
    it("local tombstone vs newer remote edit → remote edit wins (pull)", () => {
      expect(planOne(local("a", { dirty: true, deleted: true }), remote("a", 2))).toMatchObject({
        type: "pull",
      });
    });
    it("never-synced local copy whose id exists remotely → fork", () => {
      expect(planOne(local("a", { baseVersion: null, dirty: true }), remote("a", 1))).toMatchObject(
        { type: "forkThenPull" },
      );
    });
  });

  describe("server deleted it", () => {
    it("clean → drop locally", () => {
      expect(planOne(local("a", {}), remote("a", 2, true))).toMatchObject({ type: "dropLocal" });
    });
    it("dirty → restore by pushing over the tombstone", () => {
      expect(planOne(local("a", { dirty: true }), remote("a", 2, true))).toEqual({
        type: "push",
        id: "a",
        baseVersion: 2,
      });
    });
    it("both deleted → drop locally", () => {
      expect(
        planOne(local("a", { dirty: true, deleted: true }), remote("a", 2, true)),
      ).toMatchObject({ type: "dropLocal" });
    });
  });

  describe("only one side has it", () => {
    it("remote only → pull", () => {
      expect(planOne(null, remote("a", 3))).toEqual({
        type: "pull",
        id: "a",
        expectedUpdatedAt: null,
      });
    });
    it("remote tombstone only → nothing", () => {
      expect(planOne(null, remote("a", 3, true))).toBeUndefined();
    });
    it("local only → create on server", () => {
      expect(planOne(local("a", { baseVersion: null, dirty: true }), null)).toEqual({
        type: "push",
        id: "a",
        baseVersion: null,
      });
    });
    it("local tombstone the server never had → drop", () => {
      expect(planOne(local("a", { deleted: true, dirty: true }), null)).toMatchObject({
        type: "dropLocal",
      });
    });
  });
});
