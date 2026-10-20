import type { EventDoc } from "@seating/shared";

/**
 * Undo/redo history for the open document: snapshots of whole documents.
 * Documents are immutable and ops copy only what they change, so snapshots
 * share almost everything and stay cheap. Pure functions, no I/O.
 */
export interface History {
  /** Older versions, oldest first. */
  past: EventDoc[];
  /** Versions undone and available to redo, most recently undone last. */
  future: EventDoc[];
  /** Coalescing key of the last recorded edit (see `recordEdit`). */
  lastKey: string | null;
  /** When the last edit was recorded (ms). */
  lastAt: number;
}

/** Most undo steps kept. */
export const HISTORY_LIMIT = 200;

/** Edits with the same key closer together than this are one undo step. */
export const COALESCE_MS = 1000;

export const EMPTY_HISTORY: History = { past: [], future: [], lastKey: null, lastAt: 0 };

export interface RecordOptions {
  /**
   * Edits sharing a key within COALESCE_MS of each other become one undo
   * step (typing a table name: one step, not one per keystroke).
   */
  key?: string;
  now: number;
}

/** Records an edit: `previous` is the document before it. Clears redo. */
export function recordEdit(
  history: History,
  previous: EventDoc,
  { key, now }: RecordOptions,
): History {
  const coalesce =
    key !== undefined && key === history.lastKey && now - history.lastAt < COALESCE_MS;
  const past = coalesce ? history.past : [...history.past, previous].slice(-HISTORY_LIMIT);
  return { past, future: [], lastKey: key ?? null, lastAt: now };
}

/** Steps back: returns the document to show and the new history, or null if there's nothing to undo. */
export function undo(
  history: History,
  current: EventDoc,
): { doc: EventDoc; history: History } | null {
  const doc = history.past.at(-1);
  if (!doc) return null;
  return {
    doc,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      lastKey: null,
      lastAt: 0,
    },
  };
}

/** Steps forward again after an undo, or null if there's nothing to redo. */
export function redo(
  history: History,
  current: EventDoc,
): { doc: EventDoc; history: History } | null {
  const doc = history.future.at(-1);
  if (!doc) return null;
  return {
    doc,
    history: {
      past: [...history.past, current].slice(-HISTORY_LIMIT),
      future: history.future.slice(0, -1),
      lastKey: null,
      lastAt: 0,
    },
  };
}
