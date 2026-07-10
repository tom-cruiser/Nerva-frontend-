/**
 * Backend contract types — mirror packages/types/src on the server.
 * Keep these in sync with the auth-tenant / sales-sync / inventory services.
 */

// ── RBAC ────────────────────────────────────────────────────────────
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';

export type Permission =
  | 'inventory:read' | 'inventory:create' | 'inventory:update' | 'inventory:delete'
  | 'sales:read' | 'sales:create' | 'sales:void'
  | 'ledger:read' | 'ledger:credit' | 'ledger:payment'
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'reports:read'
  | 'whatsapp:send';

/** Mirrors ROLE_PERMISSIONS in packages/types/src/tenant-context.ts */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete',
    'sales:read', 'sales:create', 'sales:void',
    'ledger:read', 'ledger:credit', 'ledger:payment',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'reports:read', 'whatsapp:send',
  ],
  MANAGER: [
    'inventory:read', 'inventory:create', 'inventory:update',
    'sales:read', 'sales:create', 'sales:void',
    'ledger:read', 'ledger:credit', 'ledger:payment',
    'users:read',
    'reports:read', 'whatsapp:send',
  ],
  STAFF: [
    'inventory:read',
    'sales:read', 'sales:create',
    'ledger:read',
    'reports:read',
  ],
  VIEWER: [
    'inventory:read', 'sales:read', 'ledger:read', 'reports:read',
  ],
};

// ── Auth ────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  workerTag: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// ── Error envelope (every service) ──────────────────────────────────
export type ErrorCode =
  | 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL_ERROR';

export interface ApiErrorPayload {
  error: string;
  code: ErrorCode;
  details: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

// ── Inventory (sync `pull` shape / inventories table) ───────────────
export type PaymentMethod = 'CASH' | 'MOMO' | 'CREDIT' | 'CARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Product {
  id: string;
  product_sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  category: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export interface SaleItem {
  product_sku: string;
  quantity: number;
  unit_price: number;
  total: number;
  worker_tag?: string;
}

export interface Sale {
  id: string;
  transaction_id: string;
  customer_id: string | null;
  items_sold: SaleItem[];
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  worker_tag: string;
  sale_timestamp: string;
  voided_at: string | null;
  updated_at: string;
}

// ── Ledger (customer_ledger / ledger_entries tables) ────────────────
export interface LedgerBalanceResponse {
  customerId: string;
  tenantId: string;
  balance: number;
  lastActivityAt: string;
}

export type MomoProvider = 'mtn' | 'airtel' | 'vodafone' | 'tigo' | 'cash';

// ── Sync protocol (sales-sync) ──────────────────────────────────────
export type SyncCollection = 'sales' | 'inventories' | 'customers' | 'ledger_entries';
export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncChange {
  id: string;
  collection: SyncCollection;
  action: SyncAction;
  data: Record<string, unknown>;
  updated_at: string;
  client_created_at: string;
  device_id: string;
}

export interface SyncPayload {
  client_mutation_id: string;
  tenant_id: string;
  device_id: string;
  changes: SyncChange[];
  last_sync_token?: string;
  timestamp: string;
  client_version?: string;
}

export interface SyncResponse {
  sync_token: string;
  accepted_changes: { id: string; server_id: string; action: SyncAction; collection: SyncCollection }[];
  rejected_changes: { id: string; reason: string; collection: SyncCollection; action: SyncAction }[];
  conflicts: {
    id: string;
    collection: SyncCollection;
    client_data: Record<string, unknown>;
    server_data: Record<string, unknown>;
    resolution: 'CLIENT_WINS' | 'SERVER_WINS' | 'MANUAL_REQUIRED';
    message: string;
  }[];
  stats: {
    total_received: number;
    accepted: number;
    rejected: number;
    conflicts: number;
    processing_time_ms: number;
  };
  timestamp: string;
}

export interface SyncPullResponse {
  sync_token: string;
  changes: {
    inventories: Product[];
    sales: Sale[];
  };
  timestamp: string;
}
