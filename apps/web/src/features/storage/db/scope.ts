/**
 * Which local database is active. Signed-out use has its own database;
 * each signed-in account gets a separate one, so signing out (or another
 * person signing in on the same browser) never mixes guest lists.
 */
export type StorageScope = { kind: "local" } | { kind: "account"; userId: string };

export const LOCAL_SCOPE: StorageScope = { kind: "local" };

export function dbNameForScope(scope: StorageScope): string {
  return scope.kind === "local" ? "seating-local" : `seating-account-${scope.userId}`;
}

export function sameScope(a: StorageScope, b: StorageScope): boolean {
  return dbNameForScope(a) === dbNameForScope(b);
}
