import { create } from "zustand";

import { SeatingDb } from "../db/SeatingDb";
import { LOCAL_SCOPE, type StorageScope, dbNameForScope } from "../db/scope";

interface StorageState {
  scope: StorageScope;
  db: SeatingDb;
  /** Makes `scope` the active database. Returns the previously active one. */
  activate: (scope: StorageScope) => SeatingDb;
}

/**
 * Holds the active local database. React reads it through the hook (so lists
 * re-query when the scope changes); non-React code uses `activeDb()`.
 */
export const useStorageStore = create<StorageState>((set, get) => ({
  scope: LOCAL_SCOPE,
  db: new SeatingDb(dbNameForScope(LOCAL_SCOPE)),

  activate(scope) {
    const previous = get().db;
    if (previous.name === dbNameForScope(scope)) return previous;
    set({ scope, db: new SeatingDb(dbNameForScope(scope)) });
    return previous;
  },
}));

export function activeDb(): SeatingDb {
  return useStorageStore.getState().db;
}
