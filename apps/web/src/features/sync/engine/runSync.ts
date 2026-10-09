import { MAX_EVENT_NAME_LENGTH, parseEventDoc, reidentifyEventDoc } from "@seating/shared";

import type { SeatingDb } from "../../storage/db/SeatingDb";
import { createEvent } from "../../storage/repository/eventRepository";
import {
  applyPulled,
  dropIfUnchanged,
  markPushed,
  readSyncStates,
} from "../../storage/repository/syncRepository";
import type { SyncApi } from "../api/syncApi";
import { type SyncAction, planSync } from "./planSync";

export interface SyncReport {
  pulled: number;
  pushed: number;
  deleted: number;
  /** Conflicts resolved by keeping local edits as a "(conflicted copy)". */
  forked: number;
  /** Actions skipped because the server or the user changed things mid-pass. */
  retried: number;
}

/** Called after the engine rewrites or removes a local event (so an open
 * editor can reload it). */
export type LocalChangeListener = (id: string) => void;

const MAX_PASSES = 3;

async function pull(
  db: SeatingDb,
  api: SyncApi,
  id: string,
  expectedUpdatedAt: string | null,
): Promise<boolean> {
  const remote = await api.get(id);
  if (remote.deleted || !remote.data) return false;
  return applyPulled(db, parseEventDoc(remote.data), remote.version, expectedUpdatedAt);
}

async function execute(
  db: SeatingDb,
  api: SyncApi,
  action: SyncAction,
  report: SyncReport,
  onLocalChange: LocalChangeListener,
): Promise<void> {
  switch (action.type) {
    case "pull": {
      if (await pull(db, api, action.id, action.expectedUpdatedAt)) {
        report.pulled += 1;
        onLocalChange(action.id);
      } else report.retried += 1;
      return;
    }

    case "push": {
      const record = await db.events.get(action.id);
      if (!record?.doc || record.sync.deleted) return;
      const result = await api.put(record.doc, action.baseVersion);
      if (result.ok) {
        await markPushed(db, action.id, result.version, record.updatedAt);
        report.pushed += 1;
      } else report.retried += 1;
      return;
    }

    case "deleteRemote": {
      const result = await api.remove(action.id, action.baseVersion);
      if (result.ok) {
        await dropIfUnchanged(db, action.id, action.expectedUpdatedAt);
        report.deleted += 1;
      } else report.retried += 1;
      return;
    }

    case "dropLocal": {
      if (await dropIfUnchanged(db, action.id, action.expectedUpdatedAt)) {
        onLocalChange(action.id);
      } else report.retried += 1;
      return;
    }

    case "forkThenPull": {
      const record = await db.events.get(action.id);
      if (!record?.doc || record.updatedAt !== action.expectedUpdatedAt) {
        report.retried += 1;
        return;
      }
      const copy = reidentifyEventDoc(record.doc);
      copy.name = `${record.doc.name} (conflicted copy)`.slice(0, MAX_EVENT_NAME_LENGTH);
      await createEvent(db, copy);
      if (await pull(db, api, action.id, action.expectedUpdatedAt)) {
        report.forked += 1;
        onLocalChange(action.id);
      } else report.retried += 1;
      return;
    }
  }
}

/**
 * One full sync: list the server, plan, execute; repeat (up to MAX_PASSES)
 * while anything had to be retried because state moved underneath us.
 * Network errors propagate to the caller (the scheduler reports "offline").
 */
export async function runSync(
  db: SeatingDb,
  api: SyncApi,
  onLocalChange: LocalChangeListener = () => {},
): Promise<SyncReport> {
  const report: SyncReport = { pulled: 0, pushed: 0, deleted: 0, forked: 0, retried: 0 };

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const retriedBefore = report.retried;
    const [{ events: remote }, local] = await Promise.all([api.list(), readSyncStates(db)]);
    const actions = planSync(local, remote);
    if (actions.length === 0) break;
    for (const action of actions) {
      await execute(db, api, action, report, onLocalChange);
    }
    if (report.retried === retriedBefore) break;
  }

  return report;
}
