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
