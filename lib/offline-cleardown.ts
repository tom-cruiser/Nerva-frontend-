'use client';

const isBrowser = typeof window !== 'undefined';

/**
 * The only localStorage keys allowed to survive a user switch on a shared
 * device — kept purely so the login form can prefill the tenant slug when
 * the SAME user logs back in. AuthContext#applySession re-validates this
 * carve-out against `lastUserId` before ever reusing it, and calls
 * clearAllOfflineData() (this file) whenever a genuinely different user
 * authenticates, so none of these three keys ever leak a stale value to a
 * different account.
 */
const PRESERVED_KEYS = new Set([
  'nerva.tenantId',
  'nerva.organizationId',
  'nerva.lastUserId',
]);

/**
 * Full client-side storage purge — run on logout AND whenever a different
 * user authenticates on a device that still has a previous user's session
 * cached (shared POS terminal account switch).
 *
 * lib/token-store.ts#clear() already removes the session tokens and cached
 * user profile on logout. This function is the complementary, broader sweep
 * for everything that has no legitimate reason to survive a user switch:
 *
 *   - Any other `nerva.*` localStorage key (cart drafts, feature flags,
 *     anything added later that isn't one of the three prefill keys above).
 *   - All of sessionStorage — nothing in this app namespaces sessionStorage
 *     per-user, so it must be wiped wholesale.
 *   - Every IndexedDB database this origin owns. WatermelonDB (see
 *     app/database/schema.ts) stores offline carts, the pending-sync queue,
 *     and cached product/customer catalogs in IndexedDB once instantiated —
 *     User B must never be able to read or resume User A's un-synced local
 *     data, so every database is dropped, not just the ones this file
 *     happens to know the name of.
 *
 * Best-effort throughout: a storage/IndexedDB quirk (private browsing mode,
 * an in-flight transaction, an older browser missing indexedDB.databases())
 * must never throw and block logout.
 */
export async function clearAllOfflineData(): Promise<void> {
  if (!isBrowser) return;

  // 1. Stray localStorage keys under our namespace.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nerva.') && !PRESERVED_KEYS.has(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore — never block logout on a storage quirk.
  }

  // 2. sessionStorage — no prefill use case at all, wipe entirely.
  try {
    sessionStorage.clear();
  } catch {
    // Ignore.
  }

  // 3. IndexedDB — offline cart / pending-sync-queue / cached catalogs.
  try {
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .map((db) => db.name)
          .filter((name): name is string => !!name)
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();   // best-effort
                req.onblocked = () => resolve();  // an open connection somewhere; don't hang logout
              }),
          ),
      );
    }
  } catch {
    // Ignore — indexedDB.databases() isn't universally supported (older
    // Safari/Firefox); the per-database deletes above are already
    // best-effort. Never let this block logout.
  }
}
