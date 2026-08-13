'use client';
import { useSyncExternalStore } from 'react';
import type { SyncPayload } from './types';

/**
 * Offline failure-retry queue for POS checkout. NOT a full offline-first
 * rebuild (WatermelonDB/IndexedDB) — that's out of scope for this pass. This
 * is a lightweight fallback: if `sync.pushBatch` fails with a network/service
 * error, the batch is persisted here and retried later (on `online` / next
 * page load) rather than the sale simply being lost from the cashier's view.
 *
 * Stored under a `nerva.*`-prefixed localStorage key, which
 * lib/offline-cleardown.ts's existing sweep already wipes on logout/user
 * switch with zero changes needed there (it clears every `nerva.*` key
 * except the 3 explicitly preserved ones, and this key isn't one of them).
 */

const QUEUE_KEY = 'nerva.pendingSaleBatches';

export interface PendingSaleBatch {
  id: string;
  payload: Omit<SyncPayload, 'client_mutation_id' | 'timestamp'>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readAll(): PendingSaleBatch[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(batches: PendingSaleBatch[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(batches));
  } catch {
    // Storage full/unavailable — the sale still went through the optimistic
    // UI path; losing the retry queue entry here is a degraded fallback, not
    // a silent data-loss path the cashier is unaware of.
  }
  notify();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  for (const l of listeners) l();
}

export function enqueuePendingSale(payload: PendingSaleBatch['payload'], id: string): PendingSaleBatch {
  const entry: PendingSaleBatch = {
    id,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  writeAll([...readAll(), entry]);
  return entry;
}

export function getPendingSales(): PendingSaleBatch[] {
  return readAll();
}

export function removePendingSale(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id));
}

export function bumpPendingSaleFailure(id: string, message: string): void {
  writeAll(
    readAll().map((b) => (b.id === id ? { ...b, attempts: b.attempts + 1, lastError: message } : b)),
  );
}

export function subscribePendingSales(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook — re-renders the caller whenever the queue changes. */
export function usePendingSalesCount(): number {
  return useSyncExternalStore(
    subscribePendingSales,
    () => readAll().length,
    () => 0,
  );
}
