import {
  MAX_EVENT_NAME_LENGTH,
  type RemoteEventSummary,
  parseEventDoc,
  reidentifyEventDoc,
} from "@seating/shared";

import type { SeatingDb } from "../../storage/db/SeatingDb";
import { createEvent } from "../../storage/repository/eventRepository";
import {
  type AccessMeta,
  accessMetaOf,
  applyPulled,
  dropIfUnchanged,
  markPushed,
  readSyncStates,
  refreshAccess,
  replaceWithOwnCopy,
} from "../../storage/repository/syncRepository";
import type { SyncApi } from "../api/syncApi";
import { type SyncAction, planSync } from "./planSync";
import { syncImages } from "./syncImages";

export interface SyncReport {
  pulled: number;
  pushed: number;
  deleted: number;
  /** Conflicts resolved by keeping local edits as a "(conflicted copy)". */
  forked: number;
  /** Actions skipped because the server or the user changed things mid-pass. */
  retried: number;
  /**
   * Shared events whose unsynced edits were kept as your own copy because you
   * can't change the original any more (names of the copies).
   */
  keptCopies: string[];
  /** Shared events you removed from your list. */
  left: number;
  /** Events given fresh ids because the id was someone else's. */
  reidentified: number;
  imagesUploaded: number;
  imagesDownloaded: number;
}

/**
 * Called after the engine rewrites or removes a local event (so an open
 * editor can reload it). `replacedBy` is set when the event now lives under
 * a new id (an own copy).
 */
export type LocalChangeListener = (id: string, replacedBy?: string) => void;

const MAX_PASSES = 3;

async function pull(
  db: SeatingDb,
  api: SyncApi,
  id: string,
  expectedUpdatedAt: string | null,
  access: AccessMeta,
): Promise<boolean> {
  const remote = await api.get(id);
  if (remote.deleted || !remote.data) return false;
  return applyPulled(db, parseEventDoc(remote.data), remote.version, expectedUpdatedAt, access);
}

interface PassContext {
  db: SeatingDb;
  api: SyncApi;
  report: SyncReport;
  onLocalChange: LocalChangeListener;
  remoteById: Map<string, RemoteEventSummary>;
}

async function execute(context: PassContext, action: SyncAction): Promise<void> {
  const { db, api, report, onLocalChange } = context;
  const access = accessMetaOf(context.remoteById.get(action.id));

  switch (action.type) {
    case "pull": {
      if (await pull(db, api, action.id, action.expectedUpdatedAt, access)) {
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
      } else if (result.reason === "idTaken") {
        // Someone else's event already has this id: ours becomes a new event.
        const newId = await replaceWithOwnCopy(db, action.id, record.updatedAt);
        if (newId) {
          report.reidentified += 1;
          onLocalChange(action.id, newId);
        }
        report.retried += 1;
      } else report.retried += 1;
      return;
    }

    case "keepAsCopy": {
      const record = await db.events.get(action.id);
      const newId = await replaceWithOwnCopy(db, action.id, action.expectedUpdatedAt, " (copy)");
      if (newId && record?.doc) {
        report.keptCopies.push(`${record.doc.name} (copy)`);
        onLocalChange(action.id, newId);
      } else report.retried += 1;
      return;
    }

    case "leave": {
      await api.leave(action.id);
      if (await dropIfUnchanged(db, action.id, action.expectedUpdatedAt)) {
        report.left += 1;
        onLocalChange(action.id);
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
      if (await pull(db, api, action.id, action.expectedUpdatedAt, access)) {
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
  const report: SyncReport = {
    pulled: 0,
    pushed: 0,
    deleted: 0,
    forked: 0,
    retried: 0,
    keptCopies: [],
    left: 0,
    reidentified: 0,
    imagesUploaded: 0,
    imagesDownloaded: 0,
  };

  let remote: RemoteEventSummary[] = [];
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const retriedBefore = report.retried;
    const [listed, local] = await Promise.all([api.list(), readSyncStates(db)]);
    remote = listed.events;
    const actions = planSync(local, remote);
    if (actions.length === 0) break;
    const context: PassContext = {
      db,
      api,
      report,
      onLocalChange,
      remoteById: new Map(remote.map((summary) => [summary.id, summary])),
    };
    for (const action of actions) await execute(context, action);
    if (report.retried === retriedBefore) break;
  }

  // Roles, owner names and member counts can change without a new version.
  await refreshAccess(db, remote);
  const images = await syncImages(db, api);
  report.imagesUploaded = images.uploaded;
  report.imagesDownloaded = images.downloaded;

  return report;
}
