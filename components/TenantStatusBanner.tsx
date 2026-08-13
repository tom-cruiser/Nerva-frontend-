'use client';
import React, { useEffect } from 'react';
import { useTenantLock } from '@/lib/tenant-status';
import { shifts } from '@/lib/endpoints';
import { flushPendingSales } from '@/lib/sync-retry';

/**
 * App-wide "Store Suspended" banner — mounted once in Shell.tsx so every
 * (app) route shows it, without threading lock state through layout/AuthGuard.
 *
 * While locked, polls a cheap existing authenticated endpoint every ~15s
 * purely to give lib/api.ts's request() a chance to observe recovery — a
 * successful response there calls reportTenantUnlocked() (see lib/api.ts),
 * which is what makes this banner clear itself the moment a superadmin
 * unblocks/approves the tenant, with no manual "check again" step.
 *
 * Also owns the `online` listener that flushes the offline pending-sales
 * queue (see lib/pending-sales-queue.ts) — one always-mounted place for both
 * "network came back" and "tenant came back" recovery triggers.
 */
export default function TenantStatusBanner() {
  const { locked, message, status } = useTenantLock();

  useEffect(() => {
    const onOnline = () => { void flushPendingSales(); };
    window.addEventListener('online', onOnline);
    // Also try once on mount — covers the case where the tab was already
    // open and offline when a previous sale failed to sync.
    void flushPendingSales();
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      // Any authed, low-cost GET works — a 2xx response clears the lock via
      // lib/api.ts's reportTenantUnlocked(); a repeat 423 is a no-op here.
      shifts.getCurrent().catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [locked]);

  if (!locked) return null;

  const heading = status === 'PENDING_APPROVAL' ? 'Workspace pending approval' : 'Store suspended';

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-center text-sm text-red-700 flex items-center justify-center gap-2">
      <span className="material-symbols-outlined text-base leading-none">lock</span>
      <span>
        <strong className="font-bold">{heading}.</strong>{' '}
        {message ?? 'New sales are blocked until this is resolved.'}
      </span>
    </div>
  );
}
