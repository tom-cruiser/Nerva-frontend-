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
           this.message.includes('Failed to fetch');
  }

  get isServiceUnavailable(): boolean {
    return this.status === 503 || this.isUnreachable;
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
  timeout?: number; // Added timeout option
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
    // If response is not JSON, try to get text
    try {
      const text = await res.text();
      if (text) {
        payload.error = text.slice(0, 200); // Limit text length
      }
    } catch (textError) {
      // Ignore - use default error
    }
  }
  
  // Create detailed error object
  const error = new ApiError(res.status, payload);
  
  // Add additional context
  if (error.isUnreachable) {
    error.message = `Unable to connect to the service. Please ensure the backend is running.`;
  } else if (error.isServiceUnavailable) {
    error.message = `Service is temporarily unavailable. Please try again later.`;
  } else if (error.isUnauthorized) {
    error.message = `Authentication required. Please log in again.`;
  } else if (error.isForbidden) {
    error.message = `You don't have permission to perform this action.`;
  } else if (error.isNotFound) {
    error.message = `The requested resource was not found.`;
  }
  
  return error;
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
    timeout = 30000, // 30 second timeout
  } = opts;

  const isMutation = method !== 'GET';
  const finalHeaders: Record<string, string> = { ...headers };

  // Set content type for JSON body
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  // Add authentication headers if required
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

    // Add tenant ID if available
    try {
      const tenantId = tokenStore.tenantId;
      if (tenantId && !('X-Tenant-Id' in finalHeaders)) {
        finalHeaders['X-Tenant-Id'] = tenantId;
      } else if (!tenantId && auth) {
        console.warn('[API] No tenant ID available for authenticated request');
      }
    } catch (error) {
      console.error('[API] Error getting tenant ID:', error);
    }
  }

  // Add mutation ID for idempotency
  if (isMutation && !('X-Client-Mutation-Id' in finalHeaders)) {
    finalHeaders['X-Client-Mutation-Id'] = mutationId ?? uuid();
  }

  // Add request ID for tracing
  if (!('X-Request-Id' in finalHeaders)) {
    finalHeaders['X-Request-Id'] = uuid();
  }

  // Log request for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[API] Request:', {
      method,
      path,
      url: buildUrl(path, query),
      hasAuth: !!finalHeaders['Authorization'],
      hasTenant: !!finalHeaders['X-Tenant-Id'],
    });
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // First attempt
    let res = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // If 401 and we can refresh, try once more
    if (res.status === 401 && auth && !skipRefresh) {
      console.log('[API] Token expired, attempting refresh...');
      
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          finalHeaders['Authorization'] = `Bearer ${newToken}`;
          // Retry with new token
          res = await fetch(buildUrl(path, query), {
            method,
            headers: finalHeaders,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
          console.log('[API] Token refresh successful, retrying request...');
        } else {
          console.warn('[API] Token refresh failed, no new token');
        }
      } catch (refreshError) {
        console.error('[API] Error during token refresh:', refreshError);
      }
    }

    // Clear timeout
    clearTimeout(timeoutId);

    // Handle non-2xx responses
    if (!res.ok) {
      const error = await parseError(res);
      throw error;
    }

    // Handle empty responses
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }

    // Parse JSON response
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
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle fetch errors (network issues)
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(504, {
          error: 'Request timed out. The service may be slow or unavailable.',
          code: 'TIMEOUT',
          details: { path, timeout },
        });
      }
      
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')) {
        throw new ApiError(503, {
          error: 'Unable to connect to the service. Please ensure the backend is running.',
          code: 'SERVICE_UNAVAILABLE',
          details: { path, originalError: error.message },
        });
      }
    }
    
    // Re-throw ApiError or convert to ApiError
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      details: { path, originalError: error },
    });
  }
}

// ============================================
// API Service Helpers
// ============================================

/** Auth API */
export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  register: (data: RegisterRequest) =>
    request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
    }),
  
  refresh: (refreshToken: string) =>
    request<RefreshResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),
  
  logout: (refreshToken: string) =>
    request<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),
};

/** WhatsApp API */
export const whatsapp = {
  getStatus: () =>
    request<{ 
      status: 'DISCONNECTED' | 'AUTHENTICATING' | 'READY' | 'UNAVAILABLE';
      qr?: string;
      timestamp?: string;
    }>('/api/v1/whatsapp/status', {
      auth: true,
      timeout: 10000, // 10 second timeout for status
    }),
  
  sendMessage: (number: string, message: string) =>
    request<{ success: boolean; messageId: string }>('/api/v1/whatsapp/send', {
      method: 'POST',
      body: { number, message },
      auth: true,
      timeout: 30000, // 30 second timeout for sending
    }),
  
  logout: () =>
    request<{ success: boolean; status: string }>('/api/v1/whatsapp/logout', {
      method: 'POST',
      auth: true,
    }),
};

/** Health Check */
export const health = {
  check: () =>
    request<{ status: string; service: string; timestamp: string }>('/health', {
      auth: false,
      timeout: 5000,
    }),
};

// ============================================
// Types
// ============================================

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
    workerTag: string;
    permissions: string[];
  };
}

export interface RegisterRequest {
  owner_email: string;
  password: string;
  organization_name: string;
  currency?: string;
}

export interface RegisterResponse {
  organization_id: string;
  organization_name: string;
  billing_tier: string;
  currency: string;
  owner: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
    workerTag: string;
    permissions: string[];
  };
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// Re-export for convenience
export { uuid };