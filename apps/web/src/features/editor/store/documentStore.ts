import type { EventDoc } from "@seating/shared";
import { create } from "zustand";

import { createCoalescedWriter } from "../../storage/repository/coalescedWriter";
import { getEventDoc, saveEventDoc } from "../../storage/repository/eventRepository";
import { activeDb } from "../../storage/store/storageStore";

type OpenStatus = "idle" | "loading" | "ready" | "missing" | "error";
export type SaveStatus = "saved" | "saving" | "error";

interface DocumentState {
  /** The event open in the editor — the single source of truth for its
   * tables, guests and assignments while editing. */
  doc: EventDoc | null;
  status: OpenStatus;
  saveStatus: SaveStatus;

  /** Loads an event from the local database (flushing any pending save first). */
  open: (id: string) => Promise<void>;
  /** Re-reads the open event from the database (e.g. after a sync pull). */
  reload: () => Promise<void>;
  /** Saves pending changes and closes the editor's document. */
  close: () => Promise<void>;
  /**
   * Applies a pure edit (from @seating/shared) to the open document and
   * persists it. Edits that return the same object are no-ops.
   */
  apply: (edit: (doc: EventDoc) => EventDoc) => void;
}

/** Persists every change immediately, coalescing bursts (see coalescedWriter). */
const writer = createCoalescedWriter<EventDoc>(
  (doc) => doc.id,
  (doc) => saveEventDoc(activeDb(), doc),
  {
    onStart: () => useDocumentStore.setState({ saveStatus: "saving" }),
    onIdle: (failed) => useDocumentStore.setState({ saveStatus: failed ? "error" : "saved" }),
    onError: (error) => console.error("Failed to save event locally", error),
  },
);

/** Waits for in-flight saves; used before switching documents or storage scopes. */
export function flushDocumentWrites(): Promise<void> {
  return writer.flush();
}

/** True while a save is queued or in flight (drives the unsaved-changes guard). */
export function hasUnsavedChanges(): boolean {
  return !writer.isIdle();
}

let openRequest = 0;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: null,
  status: "idle",
  saveStatus: "saved",

  async open(id) {
    const { doc, status } = get();
    // Idempotent: React StrictMode mounts effects twice in development.
    if (doc?.id === id && (status === "ready" || status === "loading")) return;

    const request = ++openRequest;
    set({ status: "loading", doc: null });
    await writer.flush();
    try {
      const loaded = await getEventDoc(activeDb(), id);
      if (request !== openRequest) return; // a newer open() won
      set({ doc: loaded, status: loaded ? "ready" : "missing", saveStatus: "saved" });
    } catch (error) {
      console.error("Failed to open event", error);
      if (request === openRequest) set({ status: "error" });
    }
  },

  async reload() {
    const current = get().doc;
    if (!current) return;
    await writer.flush();
    const loaded = await getEventDoc(activeDb(), current.id);
    if (get().doc?.id !== current.id) return;
    set({ doc: loaded, status: loaded ? "ready" : "missing" });
  },

  async close() {
    openRequest += 1;
    await writer.flush();
    set({ doc: null, status: "idle" });
  },

  apply(edit) {
    const { doc } = get();
    if (!doc) return;
    const next = edit(doc);
    if (next === doc) return;
    set({ doc: next });
    writer.schedule(next);
  },
}));
