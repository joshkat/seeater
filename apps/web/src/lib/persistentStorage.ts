/**
 * Asks the browser not to evict this site's storage under pressure.
 *
 * Without it, IndexedDB is "best effort": Safari in particular may clear a
 * site's data after ~7 days without a visit (installed home-screen apps are
 * exempt). Chrome grants this silently for engaged/installed sites; Firefox may
 * show a prompt — so we only ask once the user has something worth keeping
 * (their first event), not on page load. Safe to call repeatedly.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
