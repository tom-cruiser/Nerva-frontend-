'use client';
import { supabase } from './supabase';
import { tokenStore } from './token-store';
import type { ApiErrorPayload, ErrorCode } from './types';

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

  get isNotImplemented(): boolean {
    return this.status === 501;
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
  skipRefresh?: boolean;
  mutationId?: string;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
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

/** Core request helper. */
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
  if (auth) {
    const token = await getAccessToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
    const tenantId = tokenStore.tenantId;
    if (tenantId && !('X-Tenant-Id' in finalHeaders)) {
      finalHeaders['X-Tenant-Id'] = tenantId;
    }
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

/** WhatsApp API Service Helpers */
export const whatsapp = {
  getStatus: () => 
    request<{ status: 'DISCONNECTED' | 'AUTHENTICATING' | 'READY', qr?: string }>('/api/v1/whatsapp/status'),
  
  sendMessage: (number: string, message: string) => 
    request<{ success: boolean; messageId: string }>('/api/v1/whatsapp/send', { 
      method: 'POST', 
      body: { number, message } 
    })
};

export { uuid };