'use client';
import { supabase } from './supabase';
import { tokenStore } from './token-store';
import type { ApiErrorPayload, ErrorCode } from './types';
import { reportTenantLocked, reportTenantUnlocked } from './tenant-status';

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

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnreachable(): boolean {
    return this.message.includes('ECONNREFUSED') || 
           this.message.includes('unreachable') ||
           this.message.includes('Failed to fetch') ||
           this.message.includes('NetworkError') ||
           this.message.includes('fetch failed');
  }

  get isServiceUnavailable(): boolean {
    return this.status === 503 || this.isUnreachable;
  }

  /** 423 Locked — the tenant is suspended or (see PENDING_APPROVAL) not yet
   *  approved. See lib/tenant-status.ts for the app-wide banner this drives. */
  get isLocked(): boolean {
    return this.status === 423;
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
  timeout?: number;
  tenantId?: string;
  retries?: number; // Number of retries for network errors
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch (error) {
    console.error('[API] Failed to get access token:', error);
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('[API] Failed to refresh token:', error);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (error) {
    console.error('[API] Failed to refresh session:', error);
    return null;
  }
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
    if (json && typeof json === 'object') {
      payload = { 
        error: 'Request failed', 
        ...json 
      };
    }
  } catch (jsonError) {
    try {
      const text = await res.text();
      if (text) {
        payload.error = text.slice(0, 200);
      }
    } catch (textError) {
      // Ignore
    }
  }
  
  const error = new ApiError(res.status, payload);
  
  // Add additional context based on status
  if (error.isUnreachable) {
    error.message = `Unable to connect to the service at ${API_BASE}. Please ensure the backend is running.`;
  } else if (error.isServiceUnavailable) {
    error.message = `Service is temporarily unavailable. Please try again later.`;
  } else if (error.isUnauthorized) {
    error.message = `Authentication required. Please log in again.`;
  } else if (error.isForbidden) {
    // Keep the friendly message as the headline, but don't throw away the
    // backend's specific detail (requirePermission's ApiError carries
    // details.requiredPermissions — see packages/middleware/src/
    // require-permission.ts) — without it, every 403 in the console reads
    // identically regardless of which permission was actually missing,
    // which makes an otherwise-instant diagnosis (stale role, missing
    // grant, wrong endpoint) impossible from the error alone.
    const required = error.details['requiredPermissions'];
    const requiredList = Array.isArray(required) ? required.join(', ') : undefined;
    error.message = requiredList
      ? `You don't have permission to perform this action. Missing: ${requiredList}.`
      : `You don't have permission to perform this action.`;
  } else if (error.isNotFound) {
    error.message = `The requested resource was not found.`;
  }
  // NOTE: isLocked (423) deliberately keeps the backend's own message as-is
  // (unlike the branches above) — it's the only status where the message
  // text itself matters to the UI, distinguishing "suspended" from "pending
  // approval" (see tenant-context.ts's Errors.locked() calls).
  
  return error;
}

/** 
 * Sleep helper for retry backoff 
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Core request helper with retry logic. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    auth = true,
    skipRefresh = false,
    mutationId,
    timeout = 30000,
    tenantId,
    retries = 3, // Default 3 retries
  } = opts;

  const finalHeaders: Record<string, string> = { ...headers };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  // Add authentication headers
  if (auth) {
    try {
      const token = await getAccessToken();
      if (token) {
        finalHeaders['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('[API] No access token available for authenticated request');
      }
    } catch (error) {
      console.error('[API] Error getting access token:', error);
    }

    // Add tenant ID - use provided tenantId or from tokenStore
    try {
      const effectiveTenantId = tenantId || tokenStore.tenantId;
      if (effectiveTenantId && !('X-Tenant-Id' in finalHeaders)) {
        finalHeaders['X-Tenant-Id'] = effectiveTenantId;
      } else if (!effectiveTenantId && auth) {
        console.warn('[API] No tenant ID available for authenticated request');
      }
    } catch (error) {
      console.error('[API] Error getting tenant ID:', error);
    }
  }

  if (method !== 'GET' && !('X-Client-Mutation-Id' in finalHeaders)) {
    finalHeaders['X-Client-Mutation-Id'] = mutationId ?? uuid();
  }

  if (!('X-Request-Id' in finalHeaders)) {
    finalHeaders['X-Request-Id'] = uuid();
  }

  const fullUrl = buildUrl(path, query);

  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Request:', {
      method,
      path,
      url: fullUrl,
      hasAuth: !!finalHeaders['Authorization'],
      hasTenant: !!finalHeaders['X-Tenant-Id'],
      tenantId: finalHeaders['X-Tenant-Id'],
      retries,
    });
  }

  let lastError: Error | null = null;

  // Retry loop for network errors
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let res = await fetch(fullUrl, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 with token refresh
      if (res.status === 401 && auth && !skipRefresh) {
        console.log('[API] Token expired, attempting refresh...');
        
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            finalHeaders['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(fullUrl, {
              method,
              headers: finalHeaders,
              body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            console.log('[API] Token refresh successful, retrying request...');
          } else {
            console.warn('[API] Token refresh failed, no new token');
          }
        } catch (refreshError) {
          console.error('[API] Error during token refresh:', refreshError);
        }
      }

      // If response is OK, process it
      if (res.ok) {
        // Any successful call from ANY page clears a stale lock — this is
        // what makes the "Store Suspended" banner auto-resolve once a
        // superadmin unblocks the tenant, with no manual "check again" step.
        reportTenantUnlocked();

        if (res.status === 204 || res.headers.get('content-length') === '0') {
          return undefined as T;
        }

        const text = await res.text();
        if (!text) {
          return undefined as T;
        }

        try {
          return JSON.parse(text) as T;
        } catch (parseError) {
          console.error('[API] Failed to parse JSON response:', parseError);
          throw new ApiError(500, {
            error: 'Invalid response format from server',
            code: 'INTERNAL_ERROR',
            details: { path, responsePreview: text.slice(0, 100) },
          });
        }
      }

      // Handle non-OK responses
      const error = await parseError(res);
      if (error.isLocked) {
        reportTenantLocked({ message: error.message, status: error.details['status'] as string | undefined });
      }
      throw error;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Check if it's a network error that should be retried
      const isNetworkError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch failed') ||
        error.message.includes('network')
      );

      // If it's a network error and we have retries left
      if (isNetworkError && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`[API] Network error (attempt ${attempt}/${retries}), retrying in ${delay}ms...`, error.message);
        lastError = error;
        await sleep(delay);
        continue; // Retry
      }

      // If it's an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(504, {
          error: 'Request timed out. The service may be slow or unavailable.',
          code: 'TIMEOUT',
          details: { path, timeout },
        });
      }

      // For any other error, create an ApiError
      throw new ApiError(503, {
        error: error instanceof Error ? error.message : 'Unable to connect to the service. Please ensure the backend is running.',
        code: 'SERVICE_UNAVAILABLE',
        details: { 
          path, 
          baseUrl: API_BASE,
          originalError: error instanceof Error ? error.message : String(error),
          attempts: attempt,
        },
      });
    }
  }

  // If we exhausted all retries
  throw new ApiError(503, {
    error: `Unable to connect to the service after ${retries} attempts. Please ensure the backend is running.`,
    code: 'SERVICE_UNAVAILABLE',
    details: { 
      path, 
      baseUrl: API_BASE,
      lastError: lastError?.message,
    },
  });
}

// ============================================
// API Service Helpers - Updated for Multi-Tenant
// ============================================

/** WhatsApp API - Updated for Multi-Tenant Support */
export const whatsapp = {
  // Connect - Start or resume WhatsApp session
  connect: (tenantId?: string) =>
    request<{ 
      success: boolean;
      status: 'DISCONNECTED' | 'AUTHENTICATING' | 'READY' | 'FAILED';
      qr?: string;
      tenantId: string;
      timestamp: string;
    }>('/api/v1/whatsapp/connect', {
      method: 'POST',
      auth: true,
      tenantId,
      timeout: 15000,
      retries: 2, // Only 2 retries for connect
    }),
  
  // Get status for the current tenant
  getStatus: (tenantId?: string) =>
    request<{ 
      success: boolean;
      status: 'DISCONNECTED' | 'AUTHENTICATING' | 'READY' | 'FAILED' | 'TIMEOUT';
      qr?: string;
      health?: 'healthy' | 'unhealthy' | 'unknown';
      messageCount?: number;
      lastActivity?: string;
      timestamp: string;
    }>('/api/v1/whatsapp/status', {
      auth: true,
      tenantId,
      timeout: 10000,
      retries: 2,
    }),
  
  // Send a single message
  sendMessage: (number: string, message: string, tenantId?: string) =>
    request<{ 
      success: boolean; 
      messageId: string;
      recipient: string;
      tenantId: string;
      timestamp: string;
    }>('/api/v1/whatsapp/send', {
      method: 'POST',
      body: { number, message },
      auth: true,
      tenantId,
      timeout: 30000,
      retries: 1,
    }),
  
  // Send bulk messages
  sendBulk: (recipients: string[], message: string, options?: {
    delayBetween?: number;
    chunkSize?: number;
    customMessages?: Record<string, string>;
    waitForAll?: boolean;
  }, tenantId?: string) =>
    request<{
      success: boolean;
      summary: {
        total: number;
        successful: number;
        failed: number;
      };
      results: Array<{
        number: string;
        success: boolean;
        messageId?: string;
        error?: string;
        timestamp: string;
      }>;
      errors: string[];
      tenantId: string;
      startedAt: string;
      completedAt: string;
    }>('/api/v1/whatsapp/send-bulk', {
      method: 'POST',
      body: { recipients, message, options },
      auth: true,
      tenantId,
      timeout: 120000, // 2 minutes for bulk
      retries: 1,
    }),
  
  // Logout and destroy session
  logout: (tenantId?: string) =>
    request<{ 
      success: boolean; 
      status: string;
      tenantId: string;
      timestamp: string;
    }>('/api/v1/whatsapp/logout', {
      method: 'POST',
      auth: true,
      tenantId,
      retries: 2,
    }),
  
  // Admin: List all sessions (requires admin privileges)
  listSessions: () =>
    request<{
      success: boolean;
      stats: {
        total: number;
        ready: number;
        authenticating: number;
        failed: number;
        disconnected: number;
        timeout: number;
      };
      sessions: Array<{
        tenantId: string;
        status: string;
        messageCount: number;
        createdAt: string;
        lastActivity: string;
        lastError?: string;
      }>;
      timestamp: string;
    }>('/api/v1/whatsapp/admin/sessions', {
      auth: true,
      timeout: 10000,
      retries: 2,
    }),
  
  // Aggregate operational status for the current tenant's session.
  // NOTE: this endpoint used to be reachable with no auth at all and leaked
  // raw per-tenant session data (tenantId/messageCount/lastActivity) for up
  // to 10 tenants to anyone. The backend now requires a valid bearer token
  // (see services/whatsapp-engine/src/routes/whatsapp-routes.ts) and only
  // returns aggregate counts, not a per-tenant `recentSessions` breakdown —
  // this call site was dead code (no caller in the app) so nothing else
  // needed updating, but the shape below now matches what the server
  // actually returns instead of the old leaked shape.
  getPublicStatus: () =>
    request<{
      success: boolean;
      service: string;
      status: string;
      stats: {
        total: number;
        ready: number;
        authenticating: number;
        failed: number;
        disconnected: number;
        timeout: number;
      };
      timestamp: string;
    }>('/api/v1/whatsapp/public-status', {
      timeout: 5000,
      retries: 3,
    }),
};

// NOTE: this used to also export an `auth` object (login/register/refresh/
// logout via request()) backed by a custom RS256 auth path on the backend.
// That path was removed as dead code — never called anywhere in the app
// (real registration goes through lib/endpoints.ts's `auth.register`, real
// sign-in/out through Supabase directly in app/context/AuthContext.tsx) and
// its tokens were incompatible with the Supabase-JWKS verification every
// service actually trusts.

/** Health Check */
export const health = {
  check: () =>
    request<{ 
      status: string; 
      service: string;
      version?: string;
      environment?: string;
      sessions?: {
        total: number;
        ready: number;
        authenticating: number;
        failed: number;
        disconnected: number;
        timeout: number;
      };
      timestamp: string;
    }>('/health', {
      auth: false,
      timeout: 5000,
      retries: 3,
    }),
};

// Helper to check if service is reachable
export async function checkServiceReachability(): Promise<{ reachable: boolean; url: string; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return { reachable: true, url: API_BASE };
    }
    
    return { 
      reachable: false, 
      url: API_BASE,
      message: `Service returned status ${response.status}` 
    };
  } catch (error) {
    return {
      reachable: false,
      url: API_BASE,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { uuid };