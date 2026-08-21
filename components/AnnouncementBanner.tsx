'use client';
import React, { useEffect, useState } from 'react';
import { announcements } from '@/lib/endpoints';
import { onRealtimeEvent } from '@/lib/realtime';
import type { PlatformAnnouncement } from '@/lib/types';

/**
 * App-wide superadmin announcement banner — mounted once in Shell.tsx so
 * every (app) route shows it, the same way TenantStatusBanner does.
 *
 * Two delivery paths, on purpose:
 *   1. A REST fetch on mount (+ periodic refresh) — the only way a tab
 *      opened *after* an announcement was created ever finds out about it,
 *      and the fallback for anyone who missed the socket push below.
 *   2. A live push over the existing Socket.IO connection (see
 *      services/realtime + settings-router.ts's publishRealtimeEvent calls)
 *      — makes it appear/disappear instantly for tabs already open, instead
 *      of waiting for the next periodic refresh.
 * Neither path is the sole source of truth; either one alone is enough to
 * show/hide an announcement correctly, so a missed socket event never
 * leaves a stale banner up longer than one refresh cycle.
 */

const REFRESH_INTERVAL_MS = 60_000;
const DISMISSED_KEY = 'nerva:dismissed-announcements';

function getDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function addDismissedId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDismissedIds();
    ids.add(id);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage blocked/full — worst case the banner reappears next load.
  }
}

const LEVEL_STYLE: Record<PlatformAnnouncement['level'], string> = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
};

const LEVEL_ICON: Record<PlatformAnnouncement['level'], string> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'error',
};

export default function AnnouncementBanner() {
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissedIds());

  const refresh = () => {
    announcements
      .getActive()
      .then((res) => setItems(res.announcements))
      .catch(() => {
        // Best-effort — a failed refresh just leaves the last-known list
        // showing (or empty, on first load) rather than surfacing an error
        // for a feature that's cosmetic, not functional.
      });
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const offCreated = onRealtimeEvent<PlatformAnnouncement>('platform:announcement_created', (announcement) => {
      setItems((prev) => (prev.some((a) => a.id === announcement.id) ? prev : [announcement, ...prev]));
    });
    const offUpdated = onRealtimeEvent<PlatformAnnouncement>('platform:announcement_updated', (announcement) => {
      setItems((prev) => prev.map((a) => (a.id === announcement.id ? announcement : a)));
    });
    // Deactivated and deleted have the same effect here (the announcement
    // disappears) — kept as two event names on the wire since the backend
    // distinguishes a soft toggle from a hard delete, even though this
    // banner doesn't need to care which one happened.
    const removeById = ({ id }: { id: string }) => setItems((prev) => prev.filter((a) => a.id !== id));
    const offDeactivated = onRealtimeEvent<{ id: string }>('platform:announcement_deactivated', removeById);
    const offDeleted = onRealtimeEvent<{ id: string }>('platform:announcement_deleted', removeById);
    return () => {
      offCreated();
      offUpdated();
      offDeactivated();
      offDeleted();
    };
  }, []);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    addDismissedId(id);
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`border-b px-4 py-2.5 text-sm flex items-center justify-center gap-2 ${LEVEL_STYLE[a.level]}`}
        >
          <span className="material-symbols-outlined text-base leading-none">{LEVEL_ICON[a.level]}</span>
          <span className="text-center">{a.message}</span>
          <button
            onClick={() => handleDismiss(a.id)}
            aria-label="Dismiss announcement"
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
