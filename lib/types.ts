/**
 * Backend contract types — mirror packages/types/src on the server.
 * Keep these in sync with the auth-tenant / sales-sync / inventory services.
 */

// ── RBAC ────────────────────────────────────────────────────────────
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER';

export type Permission =
  | 'inventory:read' | 'inventory:create' | 'inventory:update' | 'inventory:delete'
  | 'sales:read' | 'sales:create' | 'sales:void' | 'sales:refund'
  // ledger:create/ledger:update were missing here even though the backend
  // (packages/types/src/tenant-context.ts) has always had them and actively
  // gates POST/PATCH /customers with them — added to close the drift.
  | 'ledger:read' | 'ledger:create' | 'ledger:update' | 'ledger:credit' | 'ledger:payment'
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'reports:read'
  | 'whatsapp:send'
  | 'shifts:read' | 'shifts:manage';

/** Mirrors ROLE_PERMISSIONS in packages/types/src/tenant-context.ts */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete',
    'sales:read', 'sales:create', 'sales:void', 'sales:refund',
    'ledger:read', 'ledger:create', 'ledger:update', 'ledger:credit', 'ledger:payment',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'reports:read', 'whatsapp:send',
    'shifts:read', 'shifts:manage',
  ],
  MANAGER: [
    'inventory:read', 'inventory:create', 'inventory:update',
    'sales:read', 'sales:create', 'sales:void', 'sales:refund',
    'ledger:read', 'ledger:create', 'ledger:update', 'ledger:credit', 'ledger:payment',
    'users:read',
    'reports:read', 'whatsapp:send',
    'shifts:read', 'shifts:manage',
  ],
  // Deliberately excludes 'ledger:read'/'reports:read' — cashiers must not
  // see the customer debt book or profit/sales-report data (admin3.md).
  // Mirrors packages/types/src/tenant-context.ts on the backend.
  STAFF: [
    'inventory:read',
    'sales:read', 'sales:create',
    'shifts:read', 'shifts:manage',
  ],
  VIEWER: [
    'inventory:read', 'sales:read', 'ledger:read', 'reports:read',
    'shifts:read',
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

// ── Multi-tenant registration / seat provisioning ───────────────────
/**
 * Billing tiers mirror the `tenants.billing_tier` CHECK constraint in
 * packages/db/src/migrations/001_initial_schema.sql.
 */
export type BillingTier = 'starter' | 'premium' | 'business' | 'business_premium';

/**
 * Frontend seat-limit gate. Authoritative enforcement lives on the backend;
 * these values only drive the client-side tier-gate UX (disable/upgrade hints).
 * Starter = 2 seats per the product spec.
 */
export const TIER_SEAT_LIMITS: Record<BillingTier, number> = {
  starter: 2,
  premium: 5,
  business: 15,
  business_premium: Number.POSITIVE_INFINITY,
};

export const TIER_LABELS: Record<BillingTier, string> = {
  starter: 'Starter',
  premium: 'Premium',
  business: 'Business',
  business_premium: 'Business Premium',
};

/** Step 1 (account) + Step 2 (store) fields collapsed into one payload. */
export interface RegisterRequest {
  owner_email: string;
  password: string;
  owner_phone_number: string;
  organization_name: string;
  /** ISO-4217 baseline market currency, e.g. 'RWF'. */
  currency: string;
  /** Idempotency / LWW anchor for the create — timestamptz (ISO-8601). */
  client_created_at: string;
}

export interface RegisterResponse {
  /**
   * The tenant/organization id. This is the global data-isolation boundary
   * injected into every offline-first WatermelonDB record (organization_id).
   */
  organization_id: string;
  organization_name: string;
  billing_tier: BillingTier;
  currency: string;
  /** Present when the backend issues a session on registration (auto-login). */
  owner?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
}

/** A provisioned team member (row in `users`, scoped to the tenant). */
export interface Seat {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  /** Immutable theft-prevention tag stamped onto every sale the worker rings up. */
  worker_tag: string;
  is_active: boolean;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz — LWW comparison key
  /** NULL = plain role-derived defaults; non-null = this seat has an
   *  individual permission override (see EXTRA_PERMISSION_GROUPS). */
  permissions: Permission[] | null;
}

/**
 * Permissions an Admin can individually grant a worker on top of their
 * role's defaults, grouped into single toggleable bundles — mirrors
 * GRANTABLE_EXTRA_PERMISSIONS in the backend's seats-handler.ts exactly
 * (keep the two in sync). Deliberately excludes anything that could let a
 * worker approach OWNER-level control (users:*, superadmin:*, platform:*).
 */
export interface ExtraPermissionGroup {
  key: string;
  label: string;
  description: string;
  permissions: Permission[];
}

export const EXTRA_PERMISSION_GROUPS: ExtraPermissionGroup[] = [
  {
    key: 'ledger',
    label: 'Ledger access',
    description: 'View the customer debt book and record credit/payments.',
    permissions: ['ledger:read', 'ledger:create', 'ledger:update', 'ledger:credit', 'ledger:payment'],
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'View sales/profit reports and WhatsApp report data.',
    permissions: ['reports:read'],
  },
  {
    key: 'inventory',
    label: 'Inventory management',
    description: 'Add, edit, and remove products (beyond read-only access).',
    permissions: ['inventory:create', 'inventory:update', 'inventory:delete'],
  },
  {
    key: 'void',
    label: 'Void sales',
    description: 'Cancel a completed sale.',
    permissions: ['sales:void'],
  },
  {
    key: 'refund',
    label: 'Refund sales',
    description: 'Process a goods refund (full or partial) against a completed sale.',
    permissions: ['sales:refund'],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Send WhatsApp messages and reports to customers.',
    permissions: ['whatsapp:send'],
  },
];

/** Flat list of every permission any group can grant — used to validate/
 *  filter a seat's current overrides down to "which groups are active". */
export const ALL_GRANTABLE_EXTRA_PERMISSIONS: Permission[] =
  EXTRA_PERMISSION_GROUPS.flatMap((g) => g.permissions);

export interface SeatListResponse {
  seats: Seat[];
  tier: BillingTier;
  /** Server-reported ceiling; falls back to TIER_SEAT_LIMITS[tier] on the client. */
  max_seats: number;
  used_seats: number;
}

export interface CreateSeatRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  worker_tag: string;
  /** timestamptz (ISO-8601) for Last-Write-Wins sync comparisons. */
  client_created_at: string;
  /** Extra permissions beyond the role's defaults — see EXTRA_PERMISSION_GROUPS. */
  extra_permissions?: Permission[];
}

// ── Error envelope (every service) ──────────────────────────────────
// Mirrors packages/types/src/error.ts on the backend, plus 'TIMEOUT' — a
// client-only synthesized code (lib/api.ts throws it locally on an
// AbortController timeout; no service ever sends it over the wire).
export type ErrorCode =
  | 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE' | 'LOCKED' | 'INTERNAL_ERROR'
  | 'FEATURE_NOT_ENABLED'
  | 'CONNECT_FAILED' | 'STATUS_FAILED' | 'SEND_FAILED' | 'BULK_SEND_FAILED'
  | 'LOGOUT_FAILED' | 'ADMIN_ERROR' | 'REPORT_FAILED' | 'SCHEDULE_FAILED'
  | 'TIMEOUT';

export interface ApiErrorPayload {
  error: string;
  code: ErrorCode;
  details: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

// ── Inventory (sync `pull` shape / inventories table) ───────────────
export type PaymentMethod = 'CASH' | 'MOMO' | 'CREDIT' | 'CARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

/** A recorded delivery/receiving event against one product — the backend's
 *  restock mechanism (POST /api/v1/inventory/products/:id/supplier-logs).
 *  Recording one atomically bumps that product's stock_quantity by
 *  quantity_received in the same transaction. */
export interface SupplierLog {
  id: string;
  product_id: string;
  product_sku: string;
  supplier_name: string;
  supplier_contact: string | null;
  quantity_received: number;
  unit_cost: number | null;
  received_at: string;
  notes: string | null;
  created_at: string;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: string;
  /** "1 of this unit = conversion_factor base_units" (e.g. Carton = 24 pieces). */
  conversion_factor: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  product_sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit_price: number;
  /** Always denominated in base_unit — fractional for weighable/liquid
   *  items (e.g. 1.5 when base_unit is 'kg'). */
  stock_quantity: number;
  reorder_level: number;
  /** Recommended reorder size — null until an Admin sets one. */
  reorder_quantity: number | null;
  /** The unit stock_quantity is tracked in (e.g. 'pieces', 'kg', 'ml'). */
  base_unit: string;
  category: string | null;
  /** Cost basis for Net Profit reporting — null until an Admin sets one. */
  cost_price: number | null;
  /** Percentage tax rate (0-100) the shop owner sets on this specific
   *  product — applied per line item at POS checkout. No tenant-wide
   *  default; unset means 0%, not "unknown" (unlike cost_price). */
  tax_rate: number;
  /** Optimistic-lock version — required by PATCH /products/:id. */
  version: number;
  /** Non-base selling units for this product, when loaded. */
  units?: ProductUnit[];
  updated_at: string;
  deleted_at: string | null;
}

export interface SaleItem {
  product_sku: string;
  quantity: number;
  /** The selling unit this line was rung up in (e.g. 'Carton', 'Kg') —
   *  omitted means the product's own base_unit. See product_units /
   *  reserveStockForSale on the backend. */
  unit?: string;
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
  /** Running total of everything refunded against this sale so far — 0 until
   *  the first refund. See POST /api/v1/sync/sales/:saleId/refunds. */
  refunded_amount: number;
  worker_tag: string;
  sale_timestamp: string;
  voided_at: string | null;
  updated_at: string;
}

// ── Goods refunds (sales-sync's sales-router.ts) ─────────────────────
export interface RefundLineItem {
  product_sku: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total: number;
}

export interface RefundRequest {
  items: { product_sku: string; quantity: number; unit?: string }[];
  reason: string;
  /** FALSE for damaged/unsellable goods — money is still refunded, stock is
   *  deliberately not returned to sellable inventory. Defaults to true. */
  restock?: boolean;
  /** Optional dedup key — a retried submission with the same value replays
   *  the original refund instead of processing it twice. */
  client_reference?: string;
}

export interface RefundRecord {
  id: string;
  saleId: string;
  itemsRefunded: RefundLineItem[];
  refundAmount: number;
  reason: string;
  restocked: boolean;
  createdAt: string;
}

export interface RefundResponse {
  refund: RefundRecord;
  sale: {
    id: string;
    paymentStatus: PaymentStatus;
    refundedAmount: number;
    totalAmount: number;
  };
  idempotentReplay: boolean;
}

// ── Sales history (sales-sync's sales-router.ts GET routes) ─────────
/** One row from GET /api/v1/sync/sales or the `sale` field of the detail
 *  route — raw snake_case, matching the DB row shape (unlike RefundResponse
 *  above, which is the POST route's own camelCase result shape). */
export interface SaleListItem {
  id: string;
  transaction_id: string;
  customer_id: string | null;
  /** Attached via a LEFT JOIN on customer_ledger — null for a walk-in sale
   *  or if the customer record was since removed. */
  customer_name: string | null;
  items_sold: SaleItem[];
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  refunded_amount: number;
  worker_tag: string;
  sale_timestamp: string;
  voided_at: string | null;
  void_reason: string | null;
  updated_at: string;
}

export interface SaleListResponse {
  sales: SaleListItem[];
  total: number;
  limit: number;
  offset: number;
}

/** One row from a sale's refund history (GET .../refunds or embedded in the
 *  detail response) — snake_case, matches sale_refunds table columns. */
export interface SaleRefundRow {
  id: string;
  items_refunded: RefundLineItem[];
  refund_amount: number;
  reason: string;
  restocked: boolean;
  ledger_entry_id: string | null;
  worker_tag: string;
  refunded_by: string | null;
  created_at: string;
}

/** How much of one sold line is still refundable right now — the exact same
 *  math the backend enforces (computeRefundableLines in refund-service.ts),
 *  so the refund form can cap its quantity inputs without duplicating it. */
export interface SaleRefundableLine {
  product_sku: string;
  unit?: string;
  unit_price: number;
  quantitySold: number;
  quantityRefunded: number;
  quantityRemaining: number;
}

export interface SaleDetailResponse {
  sale: SaleListItem;
  refunds: SaleRefundRow[];
  refundable_lines: SaleRefundableLine[];
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

// ── Shifts (cash_drawer_shifts table) ────────────────────────────────
/**
 * A single shared till per tenant, not per-worker clock-in/out: opening a new
 * shift force-closes whatever shift a previous worker left open.
 */
export type ShiftStatus = 'OPEN' | 'CLOSED' | 'ANOMALY' | 'FORCE_CLOSED';

export interface NoOpenShift {
  status: 'NO_OPEN_SHIFT';
}

export interface CurrentShift {
  shift_id: string;
  worker_tag: string;
  opened_at: string;
  opening_balance: number;
  status: ShiftStatus;
  /** CASH-only PAID sales since opened_at — what the physical drawer should hold. */
  cash_sales_total: number;
  /** All PAID sales regardless of payment method (CASH + MOMO + CARD). */
  all_sales_total: number;
  sales_count: number;
}

export interface OpenShiftResponse {
  shift_id: string;
  opened_at: string;
  worker_tag: string;
  opening_balance: number;
  status: 'OPEN';
}

export interface CloseShiftResponse {
  shift_id: string;
  worker_tag: string;
  opened_at: string;
  opening_balance: number;
  expected_cash: number;
  reported_cash: number;
  discrepancy: number;
  status: ShiftStatus;
  sales_total: number;
}

export interface ShiftHistoryEntry {
  shift_id: string;
  worker_tag: string;
  closed_by_worker_tag: string | null;
  opened_at: string;
  closed_at: string;
  opening_balance: number;
  sales_total: number | null;
  expected_cash: number | null;
  reported_cash: number | null;
  discrepancy: number | null;
  status: ShiftStatus;
}

export interface StaffPerformanceEntry {
  id: string;
  full_name: string | null;
  role: UserRole;
  worker_tag: string;
  is_active: boolean;
  sales_count: number;
  revenue: number;
}

export interface StaffPerformanceResponse {
  window_start: string | null;
  is_open: boolean;
  staff: StaffPerformanceEntry[];
}
