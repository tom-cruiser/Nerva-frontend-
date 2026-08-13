'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { tokenStore } from '../../lib/token-store';
import { clearAllOfflineData } from '../../lib/offline-cleardown';
import { connectRealtime, disconnectRealtime } from '../../lib/realtime';
import { ROLE_PERMISSIONS } from '../../lib/types';
import type { AuthUser, Permission, UserRole } from '../../lib/types';

interface AuthContextShape {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  tenantId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextShape>({
  user: null,
  status: 'loading',
  tenantId: null,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
});

const VALID_ROLES: UserRole[] = ['OWNER', 'MANAGER', 'STAFF', 'VIEWER'];

function toUserRole(raw: unknown): UserRole {
  if (typeof raw === 'string') {
    const up = raw.toUpperCase() as UserRole;
    if (VALID_ROLES.includes(up)) return up;
  }
  return 'VIEWER';
}

/**
 * Map a Supabase user to our AuthUser shape. tenant_id / role / worker_tag /
 * permissions live in app_metadata (server-controlled, set by the backend
 * provisioning helper) — the same claims the backend middleware trusts.
 */
function mapUser(u: User): AuthUser {
  const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
  const role = toUserRole(meta['role']);
  const permissions =
    Array.isArray(meta['permissions']) && meta['permissions'].length > 0
      ? (meta['permissions'] as string[])
      : ROLE_PERMISSIONS[role];

  return {
    id:          u.id,
    tenantId:    (meta['tenant_id'] as string) ?? '',
    email:       u.email ?? '',
    role,
    workerTag:   (meta['worker_tag'] as string) ?? `${role}:${u.id.slice(0, 8)}`,
    permissions,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextShape['status']>('loading');

  const applySession = useCallback((session: Session | null) => {
    if (session?.user) {
      const mapped = mapUser(session.user);
      const previousUserId = tokenStore.lastUserId;
      const isDifferentUser = previousUserId !== null && previousUserId !== mapped.id;

      if (isDifferentUser) {
        // A different account just authenticated on this device without an
        // explicit logout() call in between (e.g. User A never signed out,
        // User B just typed their own credentials into the login form —
        // Supabase swaps the session and this fires directly). Nothing
        // cached for the previous user — carts, the offline pending-sync
        // queue, cached product/customer catalogs in IndexedDB, or plain
        // localStorage/sessionStorage — has any business surviving into
        // this session. logout() below also calls this on the explicit
        // sign-out path; this call is what covers the silent-switch case.
        void clearAllOfflineData();
      }

      setUser(mapped);
      setStatus('authenticated');

      // Keep the WatermelonDB / tenancy isolation boundary aligned with the
      // tenant. Always derive tenantId fresh from *this* session's claims.
      // Only fall back to a previously-cached tenantId when it was cached
      // for this SAME user (e.g. logout, then that same user logs back in
      // and the prefilled value is still theirs) — never let a different
      // user who happens to have no tenantId claim silently inherit a
      // stale tenantId left behind by a previous session on this device.
      if (mapped.tenantId) {
        tokenStore.tenantId = mapped.tenantId;
        tokenStore.organizationId = mapped.tenantId;
      } else if (isDifferentUser) {
        tokenStore.tenantId = null;
        tokenStore.organizationId = null;
      }
      tokenStore.lastUserId = mapped.id;
    } else {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  // Hydrate from the persisted Supabase session, then subscribe to changes
  // (sign-in, sign-out, token refresh) so state stays in sync across tabs.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) applySession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  // Real-time WebSocket connection (services/realtime) — connect once
  // authenticated so subscription:updated/tenant:status_changed pushes reach
  // this tab instantly (see lib/realtime.ts), disconnect on logout so a
  // stale/anonymous socket doesn't linger.
  useEffect(() => {
    if (status === 'authenticated') {
      connectRealtime();
    } else {
      disconnectRealtime();
    }
    return () => disconnectRealtime();
  }, [status]);

  // Proactively refresh the Supabase session — on a timer, whenever the tab
  // regains focus, AND whenever the user navigates to a new page — so a
  // role/permission/active-status change an Admin makes (see
  // seats-handler.ts) reaches THIS browser's own UI (Sidebar nav items,
  // RequireRole page gates) quickly, instead of waiting for the access
  // token's natural expiry (up to an hour), since app_metadata is a
  // point-in-time snapshot baked into the token at issuance, not re-read on
  // every request. The backend already enforces the change immediately
  // regardless (tenant-context.ts's live per-user override check) — this
  // keeps what the signed-in user actually SEES in sync too, without
  // requiring a manual sign-out/in.
  //
  // applySession(data.session) is called directly on the refreshed result
  // (belt-and-braces) rather than relying solely on onAuthStateChange's
  // 'TOKEN_REFRESHED' event to fire — it should, and normally does, but
  // this removes any doubt / cross-browser timing edge case.
  const lastRefreshRef = useRef(0);
  const refreshNow = useCallback((force = false) => {
    const now = Date.now();
    // Throttle: a route change, a focus event, and the timer can all land
    // within moments of each other — collapse to at most one call per 20s
    // unless the timer itself is the one firing (force=true).
    if (!force && now - lastRefreshRef.current < 20_000) return;
    lastRefreshRef.current = now;
    supabase.auth.refreshSession()
      .then(({ data, error }) => {
        if (!error && data.session) applySession(data.session);
      })
      .catch((err) => {
        console.error('[auth] Background session refresh failed:', err);
      });
  }, [applySession]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    // 60s — matches USER_OVERRIDE_CACHE_TTL_SECONDS on the backend, so the
    // frontend polls at the same cadence the backend's own cache naturally
    // invalidates at.
    const intervalId = setInterval(() => refreshNow(true), 60 * 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshNow();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [status, refreshNow]);

  // Refresh on every in-app navigation too — the moment a worker clicks
  // into e.g. "Ledgers" right after being granted access, not just whenever
  // the timer/focus triggers happen to land.
  const pathname = usePathname();
  useEffect(() => {
    if (status !== 'authenticated') return;
    refreshNow();
  }, [pathname, status, refreshNow]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    // onAuthStateChange applies the session; no manual state juggling needed.
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    tokenStore.clear();
    // Wipe carts/pending-sync-queue/cached catalogs (IndexedDB), any stray
    // localStorage key, and all of sessionStorage immediately on logout —
    // don't wait for the next login to discover a user switch happened.
    await clearAllOfflineData();
    // onAuthStateChange will flip status to 'anonymous'.
  }, []);

  const hasPermission = useCallback(
    (perm: Permission) => !!user?.permissions.includes(perm),
    [user],
  );

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        tenantId: user?.tenantId ?? null,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
