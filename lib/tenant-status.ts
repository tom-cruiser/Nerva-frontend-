'use client';
import { useSyncExternalStore } from 'react';

/**
 * Tenant-suspension (423 Locked) status — a dependency-free pub/sub so
 * `lib/api.ts` (imported everywhere, including outside React) can report a
 * lock/unlock without importing `AuthContext.tsx` (a React component), and
 * so any component can subscribe without threading state through props.
 *
 * `request()` in lib/api.ts calls reportTenantLocked() whenever a response
 * is 423, and reportTenantUnlocked() on any successful response — so the
 * lock clears itself automatically the moment the tenant is reactivated and
 * the next request succeeds, no manual "check again" step required.
 */

export interface TenantLockInfo {
  message?: string;
  /** From the backend's `details.status` — 'SUSPENDED' or 'PENDING_APPROVAL'. */
  status?: string;
}

type Listener = () => void;

interface Snapshot { locked: boolean; info: TenantLockInfo | null }

let snapshot: Snapshot = { locked: false, info: null };
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export function reportTenantLocked(info?: TenantLockInfo): void {
  // Cache-stable: useSyncExternalStore requires getSnapshot to return the
  // SAME reference when nothing changed, or it re-renders forever. Only
  // allocate a new snapshot object when the lock actually flips/updates.
  snapshot = { locked: true, info: info ?? null };
  notify();
}

export function reportTenantUnlocked(): void {
  if (!snapshot.locked) return;
  snapshot = { locked: false, info: null };
  notify();
}

export function getTenantLockSnapshot(): Snapshot {
  return snapshot;
}

export function subscribeTenantLock(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook wrapper — re-renders the caller whenever lock state changes. */
export function useTenantLock(): { locked: boolean } & TenantLockInfo {
  const snap = useSyncExternalStore(subscribeTenantLock, getTenantLockSnapshot, getTenantLockSnapshot);
  return { locked: snap.locked, message: snap.info?.message, status: snap.info?.status };
}
