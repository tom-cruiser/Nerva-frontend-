'use client';
import { sync } from './endpoints';
import { ApiError } from './api';
import { getPendingSales, removePendingSale, bumpPendingSaleFailure } from './pending-sales-queue';

/**
 * Replays queued offline sale batches (see lib/pending-sales-queue.ts)
 * through the real sync endpoint. Called on `online` and on mount of any
 * always-mounted component (see components/TenantStatusBanner.tsx) — cheap
 * enough to call opportunistically since an empty queue is a no-op.
 */
export async function flushPendingSales(): Promise<void> {
  const pending = getPendingSales();
  if (pending.length === 0) return;

  for (const entry of pending) {
    try {
      await sync.pushBatch(entry.payload);
      removePendingSale(entry.id);
    } catch (err) {
      if (err instanceof ApiError && (err.isServiceUnavailable || err.isUnreachable || err.isLocked)) {
        // Same network/tenant condition will hit every remaining entry too —
        // stop here and let the next `online`/mount trigger retry the batch.
        bumpPendingSaleFailure(entry.id, err.message);
        break;
      }
      // A definitive rejection (e.g. 403, validation) will never succeed
      // unattended — drop it rather than retrying forever.
      removePendingSale(entry.id);
    }
  }
}
