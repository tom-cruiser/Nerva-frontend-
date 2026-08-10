'use client';
import { request, uuid, ApiError } from './api';
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
  NoOpenShift,
  CurrentShift,
  OpenShiftResponse,
  CloseShiftResponse,
  ShiftHistoryEntry,
  StaffPerformanceResponse,
} from './types';

/**
 * Endpoint wrappers grouped by service. Each path maps to the gateway
 * (nginx) prefix documented in gateway/nginx.conf.
 *
 * ============================================
 * DEBUGGING LEDGER ENDPOINTS
 * ============================================
 * 
 * To debug the ledger endpoints, check:
 * 1. Is the ledger service running on port 3004?
 * 2. Is the gateway (nginx) routing /api/v1/ledger/ to port 3004?
 * 3. Are the authentication headers (Authorization, X-Tenant-Id) being sent?
 * 
 * The gateway configuration should have:
 * location /api/v1/ledger/ {
 *   proxy_pass http://analytics_service$request_uri;
 * }
 * 
 * Test with: curl http://localhost:8080/api/v1/ledger/test
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
  listProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products', {
      auth: true,
    });
  },

  getProduct(id: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}`, {
      auth: true,
    });
  },

  createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Product> {
    return request<Product>('/api/v1/inventory/products', {
      method: 'POST',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },

  updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },

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

  restockProduct(id: string, quantity: number, note?: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}/restock`, {
      method: 'POST',
      body: { quantity, note },
      auth: true,
      mutationId: uuid(),
    });
  },

  adjustStock(id: string, quantity: number, reason?: string): Promise<Product> {
    return request<Product>(`/api/v1/inventory/products/${encodeURIComponent(id)}/adjust`, {
      method: 'POST',
      body: { quantity, reason },
      auth: true,
      mutationId: uuid(),
    });
  },

  searchProducts(query: string): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>(
      `/api/v1/inventory/products/search?q=${encodeURIComponent(query)}`,
      { auth: true }
    );
  },

  listCategories(): Promise<{ categories: string[] }> {
    return request<{ categories: string[] }>('/api/v1/inventory/categories', {
      auth: true,
    });
  },

  getLowStockProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products/low-stock', {
      auth: true,
    });
  },

  getOutOfStockProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/v1/inventory/products/out-of-stock', {
      auth: true,
    });
  },

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
   * 
   * Note: This endpoint is proxied through the gateway.
   * Gateway should route /api/v1/ledger/ to analytics_service (port 3004)
   */
  async getCustomers(): Promise<{
    customers: Array<{
      id: string;
      name: string;
      phone: string;
      balance: number;
      lastActivity: string;
      trend: 'up' | 'down' | 'flat';
    }>;
  }> {
    try {
      console.log('[ledger] GET /api/v1/ledger/customers - Fetching customers');
      return await request('/api/v1/ledger/customers', { auth: true });
    } catch (error) {
      // If 404 or not implemented, return empty array - the page will use sample data
      if (error instanceof ApiError && (error.isNotFound || error.isNotImplemented)) {
        console.warn('[ledger] Customers endpoint not found, using fallback');
        console.warn('[ledger] Status:', error.status, 'Code:', error.code);
        return { customers: [] };
      }
      throw error;
    }
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
  async getTransactions(options?: {
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
    try {
      const params = new URLSearchParams();
      if (options?.customerId) params.append('customerId', options.customerId);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));
      if (options?.fromDate) params.append('fromDate', options.fromDate);
      if (options?.toDate) params.append('toDate', options.toDate);
      if (options?.type) params.append('type', options.type);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      return await request(`/api/v1/ledger/transactions${queryString}`, { auth: true });
    } catch (error) {
      if (error instanceof ApiError && (error.isNotFound || error.isNotImplemented)) {
        console.warn('[ledger] Transactions endpoint not found, returning empty');
        return { transactions: [], total: 0, page: 0, totalPages: 0 };
      }
      throw error;
    }
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
  async recordPayment(
    customerId: string,
    amount: number,
    method: 'CASH' | 'MOMO' | 'BANK_TRANSFER',
    note?: string
  ): Promise<{
    success: boolean;
    transactionId: string;
    newBalance: number;
  }> {
    try {
      // First try the payment endpoint
      return await request<{
        success: boolean;
        transactionId: string;
        newBalance: number;
      }>('/api/v1/ledger/payments', {
        method: 'POST',
        body: {
          customerId,
          amount,
          method,
          note,
          clientMutationId: uuid(),
        },
        auth: true,
        mutationId: uuid(),
      });
    } catch (error) {
      // If payment endpoint fails with 404, try the settle endpoint
      if (error instanceof ApiError && (error.isNotFound || error.isNotImplemented)) {
        console.warn('[ledger] Payments endpoint not found, trying settlement endpoint');
        const result = await request<{
          ledger_id: string;
          settled: number;
          payment_tx: string;
          allocations: Array<{ credit_id: string; applied: number }>;
        }>('/api/v1/ledger/settle', {
          method: 'POST',
          body: {
            ledger_id: customerId,
            amount,
            clientMutationId: uuid(),
          },
          auth: true,
          mutationId: uuid(),
        });
        
        return {
          success: true,
          transactionId: result.payment_tx,
          newBalance: 0, // We don't get this from the settlement endpoint
        };
      }
      throw error;
    }
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
      body: { 
        amount, 
        description: note,
        clientMutationId: uuid() 
      },
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
        customerId,
        amount,
        paymentProvider,
        providerTxnId,
        clientMutationId: uuid(),
      },
      auth: true,
      mutationId: uuid(),
    });
  },

  /**
   * GET /api/v1/ledger/summary
   * Get ledger summary statistics.
   */
  async getSummary(): Promise<{
    totalOutstanding: number;
    activeDebtors: number;
    paidThisMonth: number;
    paymentsReceived: number;
    overdue: number;
    overdueCustomers: number;
  }> {
    try {
      return await request('/api/v1/ledger/summary', { auth: true });
    } catch (error) {
      if (error instanceof ApiError && (error.isNotFound || error.isNotImplemented)) {
        console.warn('[ledger] Summary endpoint not found, returning empty stats');
        return {
          totalOutstanding: 0,
          activeDebtors: 0,
          paidThisMonth: 0,
          paymentsReceived: 0,
          overdue: 0,
          overdueCustomers: 0,
        };
      }
      throw error;
    }
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
   * 
   * This endpoint creates a customer in the customer_ledger table.
   * The backend expects:
   * - name: string (required)
   * - phone: string (required)
   * - email: string (optional)
   * - initialBalance: number (optional, defaults to 0)
   * - clientMutationId: string (auto-generated)
   * 
   * Returns the created customer with their ID and balance.
   */
  async createCustomer(data: {
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
    isExistingCustomer?: boolean;
  }> {
    const payload = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      initialBalance: data.initialBalance || 0,
      clientMutationId: uuid(),
    };

    console.log('[ledger] POST /api/v1/ledger/customers - Creating customer');
    console.log('[ledger] Payload:', payload);

    try {
      const result = await request<{
        id: string;
        name: string;
        phone: string;
        email: string | null;
        balance: number;
        createdAt: string;
        isExistingCustomer?: boolean;
      }>('/api/v1/ledger/customers', {
        method: 'POST',
        body: payload,
        auth: true,
        mutationId: uuid(),
      });
      
      console.log('[ledger] Customer created successfully:', result);
      return result;
    } catch (error) {
      console.error('[ledger] Error creating customer:', error);
      
      if (error instanceof ApiError) {
        console.error('[ledger] Status:', error.status);
        console.error('[ledger] Code:', error.code);
        console.error('[ledger] Message:', error.message);
        console.error('[ledger] Details:', error.details);
        
        // Provide more specific error messages
        if (error.status === 404) {
          throw new Error('Ledger service not reachable. Please ensure the backend is running.');
        } else if (error.status === 401 || error.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (error.status === 400) {
          throw new Error(`Invalid data: ${error.message}`);
        }
      }
      
      throw error;
    }
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
  pull(deviceId: string, lastSyncToken?: string): Promise<SyncPullResponse> {
    return request<SyncPullResponse>('/api/v1/sync/pull', {
      query: { device_id: deviceId, last_sync_token: lastSyncToken },
      auth: true,
    });
  },

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

// ── seat provisioning ────────────────────────────────────
export const seats = {
  list(): Promise<SeatListResponse> {
    return request<SeatListResponse>('/api/v1/auth/seats', {
      auth: true,
    });
  },

  create(input: CreateSeatRequest): Promise<Seat> {
    return request<Seat>('/api/v1/auth/seats', {
      method: 'POST',
      body: input,
      auth: true,
      mutationId: uuid(),
    });
  },

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

  update(userId: string, data: { role?: string; is_active?: boolean }): Promise<Seat> {
    return request<Seat>(`/api/v1/auth/seats/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: data,
      auth: true,
      mutationId: uuid(),
    });
  },
};

// ── shifts (cash drawer open/close/reconcile) ────────────────────────
export const shifts = {
  /**
   * The current open shift, or `{ status: 'NO_OPEN_SHIFT' }` when the till
   * hasn't been opened yet.
   */
  getCurrent(): Promise<CurrentShift | NoOpenShift> {
    return request<CurrentShift | NoOpenShift>('/api/v1/shifts/current', {
      auth: true,
    });
  },

  open(openingBalance: number): Promise<OpenShiftResponse> {
    return request<OpenShiftResponse>('/api/v1/shifts/open', {
      method: 'POST',
      body: { opening_balance: openingBalance },
      auth: true,
      mutationId: uuid(),
    });
  },

  close(shiftId: string, reportedCash: number): Promise<CloseShiftResponse> {
    return request<CloseShiftResponse>('/api/v1/shifts/close', {
      method: 'POST',
      body: { shift_id: shiftId, reported_cash: reportedCash },
      auth: true,
      mutationId: uuid(),
    });
  },

  getHistory(limit = 20): Promise<{ shifts: ShiftHistoryEntry[] }> {
    return request<{ shifts: ShiftHistoryEntry[] }>('/api/v1/shifts/history', {
      query: { limit },
      auth: true,
    });
  },

  getStaffPerformance(): Promise<StaffPerformanceResponse> {
    return request<StaffPerformanceResponse>('/api/v1/shifts/staff-performance', {
      auth: true,
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
  shifts,
};

export default api;