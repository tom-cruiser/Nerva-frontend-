'use client';
import { tokenStore } from './token-store';
import type { ApiErrorPayload, ErrorCode, RefreshTokenResponse } from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8080';

/** Typed error thrown by the client for any non-2xx response. */
export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details: Record<string, unknown>;
  requestId?: string;

  constructor(status: number, payload: Partial<ApiErrorPayload> & { error: string }) {
    super(payload.error);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code ?? 'INTERNAL_ERROR';
    this.details = payload.details ?? {};
    this.requestId = payload.requestId;
  }

  /** True when the backend route exists but is a 501 not-yet-implemented stub. */
  get isNotImplemented(): boolean {
    return this.status === 501;
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Extra headers (e.g. X-Tenant-Id at login). */
  headers?: Record<string, string>;
  /** Query params appended to the path. */
  query?: Record<string, string | number | undefined>;
  /** Skip Authorization header (login/refresh). */
  auth?: boolean;
  /** Skip the automatic refresh-and-retry on 401. */
  skipRefresh?: boolean;
  /** Provide an idempotency key; defaults to a fresh uuid for mutations. */
  mutationId?: string;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Refresh the access token, de-duplicating concurrent refreshes. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.refreshToken;
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as RefreshTokenResponse;
        tokenStore.setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: Partial<ApiErrorPayload> & { error: string } = {
    error: res.statusText || 'Request failed',
  };
  try {
    const json = await res.json();
    if (json && typeof json === 'object') payload = { error: 'Request failed', ...json };
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, payload);
}

/** Core request helper. Handles auth, idempotency, and 401 refresh-retry. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    auth = true,
    skipRefresh = false,
    mutationId,
  } = opts;

  const isMutation = method !== 'GET';
  const finalHeaders: Record<string, string> = { ...headers };

  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth && tokenStore.accessToken) {
    finalHeaders['Authorization'] = `Bearer ${tokenStore.accessToken}`;
  }
  if (isMutation && !('X-Client-Mutation-Id' in finalHeaders)) {
    finalHeaders['X-Client-Mutation-Id'] = mutationId ?? uuid();
  }

  const doFetch = () =>
    fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  // Auto-refresh once on an expired access token.
  if (res.status === 401 && auth && !skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      finalHeaders['Authorization'] = `Bearer ${newToken}`;
      res = await doFetch();
    }
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export { uuid };
