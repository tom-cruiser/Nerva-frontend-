'use client';
import { request, uuid } from './api';
import { tokenStore } from './token-store';
import type {
  LoginResponse,
  Product,
  LedgerBalanceResponse,
  MomoProvider,
  SyncPayload,
  SyncResponse,
  SyncPullResponse,
} from './types';

/**
 * Endpoint wrappers grouped by service. Each path maps to the gateway
 * (nginx) prefix documented in gateway/nginx.conf.
 *
 * Reality check (see backend analysis):
 *   - auth.*        → fully functional
 *   - inventory.*   → 501 stub (route exists, not implemented)
 *   - ledger.*      → 501 stub, and NOT exposed by the gateway yet
 *   - sync.*        → implemented, but the gateway forwards /api/v1/sales/
 *                     while the router mounts /api/v1/sync (prefix mismatch).
 * Callers should handle ApiError.isNotImplemented gracefully.
 */

// ── auth-tenant ─────────────────────────────────────────────────────
export const auth = {
  /** Login requires the tenant id in the X-Tenant-Id header. */
  login(tenantId: string, email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      auth: false,
      skipRefresh: true,
      headers: { 'X-Tenant-Id': tenantId },
      body: { email, password },
    });
  },

  logout(): Promise<{ message: string }> {
    const refreshToken = tokenStore.refreshToken ?? undefined;
    return request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      skipRefresh: true,
      body: { refreshToken },
    });
  },

  logoutAll(): Promise<{ message: string }> {
    const refreshToken = tokenStore.refreshToken ?? undefined;
    return request<{ message: string }>('/api/v1/auth/logout-all', {
      method: 'POST',
      skipRefresh: true,
      body: { refreshToken },
    });
  },
};

// ── inventory ───────────────────────────────────────────────────────
export const inventory = {
  /** GET /api/v1/inventory/products — currently a 501 stub on the backend. */
  listProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products');
  },
};

// ── ledger-payments ─────────────────────────────────────────────────
export const ledger = {
  getBalance(customerId: string): Promise<LedgerBalanceResponse> {
    return request<LedgerBalanceResponse>(
      `/api/v1/ledger/customers/${encodeURIComponent(customerId)}/balance`,
    );
  },

  recordCredit(customerId: string, amount: number, note?: string): Promise<unknown> {
    return request(`/api/v1/ledger/customers/${encodeURIComponent(customerId)}/credit`, {
      method: 'POST',
      body: { clientMutationId: uuid(), customerId, amount, note },
    });
  },

  recordMomoPayment(
    customerId: string,
    amount: number,
    paymentProvider: MomoProvider,
    providerTxnId?: string,
  ): Promise<unknown> {
    return request('/api/v1/ledger/payments/momo', {
      method: 'POST',
      body: { clientMutationId: uuid(), customerId, amount, paymentProvider, providerTxnId },
    });
  },
};

// ── sales-sync (offline-first) ──────────────────────────────────────
export const sync = {
  /** Pull server-side changes since last_sync_token for this device. */
  pull(deviceId: string, lastSyncToken?: string): Promise<SyncPullResponse> {
    return request<SyncPullResponse>('/api/v1/sync/pull', {
      query: { device_id: deviceId, last_sync_token: lastSyncToken },
    });
  },

  /** Push a batch of local changes (1..500). Returns 200 SyncResponse or a 202 job. */
  pushBatch(payload: Omit<SyncPayload, 'client_mutation_id' | 'timestamp'>): Promise<SyncResponse> {
    const clientMutationId = uuid();
    return request<SyncResponse>('/api/v1/sync/batch', {
      method: 'POST',
      mutationId: clientMutationId,
      body: {
        ...payload,
        client_mutation_id: clientMutationId,
        timestamp: new Date().toISOString(),
      },
    });
  },

  getStatus(jobId: string): Promise<SyncResponse> {
    return request<SyncResponse>(`/api/v1/sync/status/${encodeURIComponent(jobId)}`);
  },
};
