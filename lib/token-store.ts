'use client';
import type { AuthUser } from './types';

/**
 * Persists the session in localStorage. The backend issues RS256 JWTs;
 * we hold the access token in memory + localStorage and the refresh token
 * to obtain new access tokens on expiry.
 */
const ACCESS_KEY = 'nerva.accessToken';
const REFRESH_KEY = 'nerva.refreshToken';
const USER_KEY = 'nerva.user';
const TENANT_KEY = 'nerva.tenantId';
const ORG_KEY = 'nerva.organizationId';

const isBrowser = typeof window !== 'undefined';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const tokenStore = {
  get accessToken(): string | null {
    return isBrowser ? localStorage.getItem(ACCESS_KEY) : null;
  },
  get refreshToken(): string | null {
    return isBrowser ? localStorage.getItem(REFRESH_KEY) : null;
  },
  /** Tenant id is required in the X-Tenant-Id header at login; remember it. */
  get tenantId(): string | null {
    return isBrowser ? localStorage.getItem(TENANT_KEY) : null;
  },
  set tenantId(id: string | null) {
    if (!isBrowser) return;
    if (id) localStorage.setItem(TENANT_KEY, id);
    else localStorage.removeItem(TENANT_KEY);
  },
  /**
   * The organization id is the global data-isolation boundary for the
   * offline-first WatermelonDB client — every local record is scoped by it
   * (see app/database/schema.ts, the indexed `organization_id` column).
   * Stored separately from tenantId so it survives logout and keeps local
   * data correctly partitioned across account switches.
   */
  get organizationId(): string | null {
    return isBrowser ? localStorage.getItem(ORG_KEY) : null;
  },
  set organizationId(id: string | null) {
    if (!isBrowser) return;
    if (id) localStorage.setItem(ORG_KEY, id);
    else localStorage.removeItem(ORG_KEY);
  },
  getUser(): AuthUser | null {
    if (!isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  save(session: StoredSession): void {
    if (!isBrowser) return;
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    localStorage.setItem(TENANT_KEY, session.user.tenantId);
    // Keep the WatermelonDB isolation boundary aligned with the tenant.
    localStorage.setItem(ORG_KEY, session.user.tenantId);
  },
  setAccessToken(token: string): void {
    if (!isBrowser) return;
    localStorage.setItem(ACCESS_KEY, token);
  },
  clear(): void {
    if (!isBrowser) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    // Keep tenantId so the login form can prefill it next time.
  },
};
