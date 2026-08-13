'use client';
import { io, type Socket } from 'socket.io-client';
import { supabase } from './supabase';
import { API_BASE } from './api';
import { reportTenantLocked, reportTenantUnlocked } from './tenant-status';

/**
 * Thin Socket.IO client wrapper for the platform's real-time push events
 * (services/realtime — subscription:updated / tenant:status_changed /
 * subscription:request_created / subscription:request_decided /
 * subscription:request_rejected).
 *
 * Deliberately dependency-free of React — connectRealtime()/disconnectRealtime()
 * are called from AuthContext.tsx at the same points session status already
 * changes, and any component subscribes to a specific event via
 * onRealtimeEvent() without needing to know about the connection itself
 * (same "pub/sub, not prop-drilled state" shape as lib/tenant-status.ts).
 */

type EventHandler<T = unknown> = (data: T) => void;

let socket: Socket | null = null;

// A page's own useEffect (calling onRealtimeEvent) can in principle mount
// before AuthContext's status-driven effect calls connectRealtime() — React
// runs effects bottom-up on mount, but that ordering isn't something this
// module should depend on for correctness. Registrations made before the
// socket exists are queued here and replayed the moment connectRealtime()
// actually creates one, instead of silently no-op'ing forever.
const pendingSubscriptions: Array<{ event: string; handler: EventHandler }> = [];

/**
 * Connects (or reuses an existing connection) to services/realtime. The
 * auth token is fetched fresh on every (re)connect attempt via
 * supabase.auth.getSession() — NOT lib/token-store.ts's `accessToken` field,
 * which is dead leftover from the removed custom-JWT auth path and isn't
 * what lib/api.ts's own getAccessToken() reads either. socket.io-client's
 * function form for `auth` re-invokes this on every reconnect, so a token
 * refreshed mid-session is picked up automatically without a manual
 * disconnect/reconnect.
 */
export function connectRealtime(): void {
  if (socket) return;

  socket = io(API_BASE, {
    path: '/socket.io',
    withCredentials: true,
    auth: async (cb) => {
      const { data } = await supabase.auth.getSession();
      cb({ token: data.session?.access_token ?? '' });
    },
  });

  // tenant:status_changed feeds the EXISTING lock-banner system (built for
  // the 423-response polling path) — no new UI needed, this just makes it
  // update instantly instead of waiting for the next API call/poll.
  socket.on('tenant:status_changed', (payload: { status?: string; reason?: string }) => {
    if (payload?.status === 'SUSPENDED') {
      reportTenantLocked({
        status: 'SUSPENDED',
        message: payload.reason === 'EXPIRED'
          ? 'Your trial or subscription period has ended. Contact support to renew.'
          : 'This account has been suspended. Contact support to resolve this.',
      });
    } else if (payload?.status === 'ACTIVE') {
      reportTenantUnlocked();
    }
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[realtime] Connection error:', err.message);
  });

  // Replay anything registered while the socket didn't exist yet.
  for (const { event, handler } of pendingSubscriptions) {
    socket.on(event, handler);
  }
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
  pendingSubscriptions.length = 0;
}

/**
 * Subscribe to a specific real-time event. Returns an unsubscribe function —
 * call it from a useEffect cleanup. Safe to call before connectRealtime()
 * has run — the registration is queued and replayed once the socket exists
 * (see pendingSubscriptions above) rather than silently dropped.
 */
export function onRealtimeEvent<T = unknown>(event: string, handler: EventHandler<T>): () => void {
  const genericHandler = handler as EventHandler;

  if (socket) {
    socket.on(event, genericHandler);
  } else {
    pendingSubscriptions.push({ event, handler: genericHandler });
  }

  return () => {
    socket?.off(event, genericHandler);
    const idx = pendingSubscriptions.findIndex((p) => p.event === event && p.handler === genericHandler);
    if (idx !== -1) pendingSubscriptions.splice(idx, 1);
  };
}
