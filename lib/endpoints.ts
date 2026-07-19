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
  RegisterRequest,
  RegisterResponse,
  CreateSeatRequest,
  Seat,
  SeatListResponse,
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

  /**
   * Register a new tenant/organization and its owner account.
   * No auth; the gateway forwards to auth-tenant. The `X-Client-Mutation-Id`
   * header is attached automatically by request() for idempotent retries.
   */
  register(input: RegisterRequest): Promise<RegisterResponse> {
    return request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      auth: false,
      skipRefresh: true,
      body: input,
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
  /**
   * GET /api/v1/inventory/products
   * List all products for the current tenant.
   */
  listProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products', {
      auth: true,
    });
  },

  /**
   * GET /api/v1/inventory/products/:id
   * Get a single product by ID.
   */
  getProduct(id: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}`, {
      auth: true,
    });
  },

  /**
   * POST /api/v1/inventory/products
   * Create a new product.
   */
  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Product> {
    return request<Product>('/api/v1/inventory/products', {
      method: 'POST',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * PATCH /api/v1/inventory/products/:id
   * Update an existing product.
   */
  updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * DELETE /api/v1/inventory/products/:id
   * Delete a product (soft delete).
   */
  deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/api/v1/inventory/products/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        auth: true,
        mutationId: uuid(),
      }
    );
  },

  /**
   * POST /api/v1/inventory/products/:id/restock
   * Restock a product (increase stock quantity).
   */
  restockProduct(id: string, quantity: number, note?: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}/restock`, {
      method: 'POST',
      body: { quantity, note },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * POST /api/v1/inventory/products/:id/adjust
   * Adjust stock quantity (can be positive or negative).
   */
  adjustStock(id: string, quantity: number, reason?: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}/adjust`, {
      method: 'POST',
      body: { quantity, reason },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * GET /api/v1/inventory/products/search
   * Search products by name or SKU.
   */
  searchProducts(query: string): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>(
      `/api/v1/inventory/products/search?q=${encodeURIComponent(query)}`,
      {
        auth: true,
      }
    );
  },

  /**
   * GET /api/v1/inventory/categories
   * List all product categories.
   */
  listCategories(): Promise<{ categories: string[] }> {
    return request<{ categories: string[] }>('/api/v1/inventory/categories', {
      auth: true,
    });
  },

  /**
   * GET /api/v1/inventory/products/low-stock
   * Get all products that are below reorder level.
   */
  getLowStockProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products/low-stock', {
      auth: true,
    });
  },

  /**
   * GET /api/v1/inventory/products/out-of-stock
   * Get all products that are out of stock.
   */
  getOutOfStockProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products/out-of-stock', {
      auth: true,
    });
  },

  /**
   * POST /api/v1/inventory/products/bulk
   * Bulk create or update products.
   */
  bulkUpsert(products: Array<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<{
    success: boolean;
    created: number;
    updated: number;
    errors?: Array<{ index: number; error: string }>;
  }> {
    return request<{
      success: boolean;
      created: number;
      updated: number;
      errors?: Array<{ index: number; error: string }>;
    }>('/api/v1/inventory/products/bulk', {
      method: 'POST',
      body: { products, clientMutationId: uuid() },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * GET /api/v1/inventory/stats
   * Get inventory statistics.
   */
  getStats(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categories: number;
    lastUpdated: string;
  }> {
    return request<{
      totalProducts: number;
      totalValue: number;
      lowStockCount: number;
      outOfStockCount: number;
      categories: number;
      lastUpdated: string;
    }>('/api/v1/inventory/stats', {
      auth: true,
    });
  },
};

// ── ledger-payments ─────────────────────────────────────────────────
export const ledger = {
  /**
   * GET /api/v1/ledger/customers
   * List all customers with their balances.
   */
  getCustomers(): Promise<{
    customers: Array<{
      id: string;
      name: string;
      phone: string;
      balance: number;
      lastActivity: string;
      trend: 'up' | 'down' | 'flat';
    }>;
  }> {
    return request('/api/v1/ledger/customers', { auth: true });
  },

  /**
   * GET /api/v1/ledger/customers/:customerId/balance
   * Get balance for a specific customer.
   */
  getBalance(customerId: string): Promise<LedgerBalanceResponse> {
    return request<LedgerBalanceResponse>(
      `/api/v1/ledger/customers/${encodeURIComponent(customerId)}/balance`,
      { auth: true }
    );
  },

  /**
   * GET /api/v1/ledger/transactions
   * Get all transactions with optional filters.
   */
  getTransactions(options?: {
    customerId?: string;
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
    type?: 'PAYMENT' | 'CREDIT';
  }): Promise<{
    transactions: Array<{
      id: string;
      type: 'PAYMENT' | 'CREDIT';
      customer: string;
      customerId: string;
      amount: number;
      ref: string;
      date: string;
      balance: number;
      method?: 'CASH' | 'MOMO' | 'BANK_TRANSFER';
      note?: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (options?.customerId) params.append('customerId', options.customerId);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.fromDate) params.append('fromDate', options.fromDate);
    if (options?.toDate) params.append('toDate', options.toDate);
    if (options?.type) params.append('type', options.type);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/v1/ledger/transactions${queryString}`, { auth: true });
  },

  /**
   * GET /api/v1/ledger/customers/:customerId/transactions
   * Get transaction history for a specific customer.
   */
  getCustomerTransactions(
    customerId: string,
    options?: { limit?: number; offset?: number; fromDate?: string; toDate?: string }
  ): Promise<{
    transactions: Array<{
      id: string;
      amount: number;
      type: 'CREDIT' | 'DEBIT' | 'PAYMENT';
      description: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.fromDate) params.append('fromDate', options.fromDate);
    if (options?.toDate) params.append('toDate', options.toDate);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(
      `/api/v1/ledger/customers/${encodeURIComponent(customerId)}/transactions${queryString}`,
      { auth: true }
    );
  },

  /**
   * POST /api/v1/ledger/payments
   * Record a payment from a customer.
   */
  recordPayment(
    customerId: string,
    amount: number,
    method: 'CASH' | 'MOMO' | 'BANK_TRANSFER',
    note?: string
  ): Promise<{
    success: boolean;
    transactionId: string;
    newBalance: number;
  }> {
    return request('/api/v1/ledger/payments', {
      method: 'POST',
      body: { 
        customerId, 
        amount, 
        method, 
        note, 
        clientMutationId: uuid() 
      },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * POST /api/v1/ledger/customers/:customerId/credit
   * Record a credit for a customer.
   */
  recordCredit(customerId: string, amount: number, note?: string): Promise<{
    success: boolean;
    transactionId: string;
    newBalance: number;
  }> {
    return request(`/api/v1/ledger/customers/${encodeURIComponent(customerId)}/credit`, {
      method: 'POST',
      body: { clientMutationId: uuid(), customerId, amount, note },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * POST /api/v1/ledger/payments/momo
   * Record a mobile money payment.
   */
  recordMomoPayment(
    customerId: string,
    amount: number,
    paymentProvider: MomoProvider,
    providerTxnId?: string,
  ): Promise<{
    success: boolean;
    transactionId: string;
    newBalance: number;
  }> {
    return request('/api/v1/ledger/payments/momo', {
      method: 'POST',
      body: { 
        clientMutationId: uuid(), 
        customerId, 
        amount, 
        paymentProvider, 
        providerTxnId 
      },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * GET /api/v1/ledger/summary
   * Get ledger summary statistics.
   */
  getSummary(): Promise<{
    totalOutstanding: number;
    activeDebtors: number;
    paidThisMonth: number;
    paymentsReceived: number;
    overdue: number;
    overdueCustomers: number;
  }> {
    return request('/api/v1/ledger/summary', { auth: true });
  },

  /**
   * GET /api/v1/ledger/customers/:customerId
   * Get customer details including their transaction history.
   */
  getCustomerDetails(customerId: string): Promise<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    balance: number;
    totalPaid: number;
    totalCredit: number;
    lastActivity: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return request(`/api/v1/ledger/customers/${encodeURIComponent(customerId)}`, {
      auth: true,
    });
  },

  /**
   * POST /api/v1/ledger/customers
   * Create a new customer.
   */
  createCustomer(data: {
    name: string;
    phone: string;
    email?: string;
    initialBalance?: number;
  }): Promise<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    balance: number;
    createdAt: string;
  }> {
    return request('/api/v1/ledger/customers', {
      method: 'POST',
      body: { ...data, clientMutationId: uuid() },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * PATCH /api/v1/ledger/customers/:customerId
   * Update customer information.
   */
  updateCustomer(
    customerId: string,
    data: { name?: string; phone?: string; email?: string }
  ): Promise<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    updatedAt: string;
  }> {
    return request(`/api/v1/ledger/customers/${encodeURIComponent(customerId)}`, {
      method: 'PATCH',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * GET /api/v1/ledger/export
   * Export ledger data as CSV.
   */
  exportLedger(options?: {
    fromDate?: string;
    toDate?: string;
    customerId?: string;
    format?: 'csv' | 'excel';
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.fromDate) params.append('fromDate', options.fromDate);
    if (options?.toDate) params.append('toDate', options.toDate);
    if (options?.customerId) params.append('customerId', options.customerId);
    if (options?.format) params.append('format', options.format);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/v1/ledger/export${queryString}`, {
      auth: true,
      headers: { Accept: 'text/csv' },
    });
  },
};

// ── sales-sync (offline-first) ──────────────────────────────────────
export const sync = {
  /** Pull server-side changes since last_sync_token for this device. */
  pull(deviceId: string, lastSyncToken?: string): Promise<SyncPullResponse> {
    return request<SyncPullResponse>('/api/v1/sync/pull', {
      query: { device_id: deviceId, last_sync_token: lastSyncToken },
      auth: true,
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
      auth: true,
    });
  },

  getStatus(jobId: string): Promise<SyncResponse> {
    return request<SyncResponse>(`/api/v1/sync/status/${encodeURIComponent(jobId)}`, {
      auth: true,
    });
  },

  /**
   * GET /api/v1/sync/device/:deviceId/status
   * Get sync status for a specific device.
   */
  getDeviceStatus(deviceId: string): Promise<{
    deviceId: string;
    lastSyncToken: string;
    lastSyncAt: string;
    pendingChanges: number;
    totalChanges: number;
  }> {
    return request(`/api/v1/sync/device/${encodeURIComponent(deviceId)}/status`, {
      auth: true,
    });
  },

  /**
   * POST /api/v1/sync/device/:deviceId/register
   * Register a new device for sync.
   */
  registerDevice(deviceId: string, deviceName?: string): Promise<{
    deviceId: string;
    deviceName: string;
    syncToken: string;
    createdAt: string;
  }> {
    return request(`/api/v1/sync/device/${encodeURIComponent(deviceId)}/register`, {
      method: 'POST',
      body: { deviceName },
      auth: true,
      mutationId: uuid(),
    });
  },
};

// ── seat provisioning (auth-tenant · owner-only) ────────────────────
export const seats = {
  /** List the tenant's provisioned seats plus the tier/limit envelope. */
  list(): Promise<SeatListResponse> {
    return request<SeatListResponse>('/api/v1/auth/seats', {
      auth: true,
    });
  },

  /** Provision a new worker seat. Body carries the LWW client_created_at. */
  create(input: CreateSeatRequest): Promise<Seat> {
    return request<Seat>('/api/v1/auth/seats', {
      method: 'POST',
      body: input,
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * DELETE /api/v1/auth/seats/:userId
   * Deactivate a seat (soft delete).
   */
  deactivate(userId: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/api/v1/auth/seats/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        auth: true,
        mutationId: uuid(),
      }
    );
  },

  /**
   * PATCH /api/v1/auth/seats/:userId
   * Update a seat's role or status.
   */
  update(userId: string, data: { role?: string; is_active?: boolean }): Promise<Seat> {
    return request<Seat>(`/api/v1/auth/seats/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },
};

// ── Export all endpoints as a single object ─────────────────────────
export const api = {
  auth,
  inventory,
  ledger,
  sync,
  seats,
};

export default api;