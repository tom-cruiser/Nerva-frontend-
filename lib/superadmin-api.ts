'use client';
import { request } from './api';

/**
 * Superadmin API client — every function here calls
 * /api/v1/superadmin/* through the gateway (services/superadmin on the
 * backend). Every route requires `superadmin:access`, `platform:support`,
 * or `platform:billing` in the caller's JWT permissions (see
 * app/(platform)/layout.tsx, which already gates the whole route group on
 * `superadmin:access` — the backend enforces the finer-grained split for
 * platform:support/platform:billing on individual read endpoints; this
 * frontend currently only ever calls these as a full superadmin).
 *
 * Mutating calls (POST/PATCH) get an auto-generated `X-Client-Mutation-Id`
 * from `request()` itself — nothing to do here for idempotency.
 */

const BASE = '/api/v1/superadmin';

// ── Shared types (mirror services/superadmin's response shapes) ────────────

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type BillingTier = 'starter' | 'premium' | 'business' | 'business_premium';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  billing_tier: BillingTier;
  currency: string;
  timezone: string;
  status: TenantStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface PlatformAuditLogEntry {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  action: string;
  reason: string | null;
  performed_by: string;
  performed_by_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SubscriptionPlan {
  code: BillingTier;
  name: string;
  price_cents: number;
  billing_interval: 'monthly' | 'annual';
  max_cashiers: number | null;
  max_locations: number | null;
  max_monthly_transactions: number | null;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_code: BillingTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  plan_name: string;
  price_cents: number;
  billing_interval: 'monthly' | 'annual';
  max_cashiers: number | null;
  max_locations: number | null;
  max_monthly_transactions: number | null;
}

export interface BillingEvent {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  event_type: string;
  amount_cents: number | null;
  notes: string | null;
  created_at: string;
}

export interface FeatureFlagCatalogEntry {
  key: string;
  description: string | null;
  default_enabled: boolean;
  plan_defaults: Partial<Record<BillingTier, boolean>>;
}

export interface ResolvedFeatureFlag {
  key: string;
  description: string | null;
  enabled: boolean;
  is_override: boolean;
  overridden_by: string | null;
  overridden_at: string | null;
}

export interface AnalyticsSummary {
  mrr_cents: number;
  arr_cents: number;
  arpu_cents: number;
  active_tenants: number;
  churn_rate_30d: number;
  gmv_lifetime_cents: number;
  gmv_30d_cents: number;
  new_signups_30d: number;
  transaction_volume_trend: Array<{ date: string; count: number; amount_cents: number }>;
  timestamp: string;
}

export interface PlatformStaffRow {
  user_id: string;
  email: string;
  platform_role: 'SUPPORT' | 'BILLING_ADMIN' | 'SUPERADMIN';
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
}

export interface PlatformHealth {
  database: { total: number; idle: number; waiting: number; max: number };
  redis: { status: string; latency_ms: number | null };
  whatsapp_gateway: { reachable: boolean; status?: string };
  timestamp: string;
}

export interface PlatformErrorLogEntry {
  id: string;
  service: string;
  tenant_id: string | null;
  status_code: number;
  error_code: string | null;
  message: string;
  path: string | null;
  request_id: string | null;
  created_at: string;
}

export interface TenantRateLimit {
  tenant_id: string;
  max_requests: number;
  window_seconds: number;
  reason: string | null;
  set_by: string;
  set_at: string;
}

export interface PlatformSettings {
  id: true;
  default_currency: string;
  default_timezone: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface AnnouncementRow {
  id: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
}

export interface SupportTokenRow {
  id: string;
  tenant_id: string;
  issued_by: string;
  issued_by_email: string | null;
  reason: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

// ── Tenant lifecycle (superadmin-router.ts) ─────────────────────────────────

export const tenants = {
  list: () => request<{ tenants: TenantRow[]; timestamp: string }>(`${BASE}/tenants`),
  get: (tenantId: string) => request<{ tenant: TenantRow; timestamp: string }>(`${BASE}/tenants/${tenantId}`),
  suspend: (tenantId: string, reason: string) =>
    request<{ tenant: TenantRow; already_suspended?: boolean }>(`${BASE}/tenants/${tenantId}/suspend`, {
      method: 'POST', body: { reason },
    }),
  unblock: (tenantId: string) =>
    request<{ tenant: TenantRow; already_active?: boolean }>(`${BASE}/tenants/${tenantId}/unblock`, { method: 'POST' }),
  softDelete: (tenantId: string, reason: string) =>
    request<{ tenant: TenantRow; already_deleted?: boolean }>(`${BASE}/tenants/${tenantId}/delete`, {
      method: 'POST', body: { reason },
    }),
  purge: (tenantId: string, confirmSlug: string) =>
    request<{ purged_tenant_id: string; slug: string }>(`${BASE}/tenants/${tenantId}/purge`, {
      method: 'POST', body: { confirm: confirmSlug },
    }),
  auditLog: (tenantId?: string) =>
    request<{ entries: PlatformAuditLogEntry[]; timestamp: string }>(
      `${BASE}/audit-log${tenantId ? `?tenant_id=${tenantId}` : ''}`,
    ),
};

// ── Subscriptions, limits & feature flags (subscriptions-router.ts) ────────

export const subscriptions = {
  plans: () => request<{ plans: SubscriptionPlan[] }>(`${BASE}/plans`),
  updatePlan: (code: BillingTier, patch: Partial<Pick<SubscriptionPlan, 'price_cents' | 'max_cashiers' | 'max_locations' | 'max_monthly_transactions'>>) =>
    request<{ plan: SubscriptionPlan }>(`${BASE}/plans/${code}`, { method: 'PATCH', body: patch }),

  get: (tenantId: string) => request<{ subscription: TenantSubscription }>(`${BASE}/tenants/${tenantId}/subscription`),
  changePlan: (tenantId: string, planCode: BillingTier) =>
    request<{ subscription: TenantSubscription }>(`${BASE}/tenants/${tenantId}/subscription/change-plan`, {
      method: 'POST', body: { plan_code: planCode },
    }),
  cancel: (tenantId: string, atPeriodEnd: boolean, reason?: string) =>
    request<{ subscription: TenantSubscription }>(`${BASE}/tenants/${tenantId}/subscription/cancel`, {
      method: 'POST', body: { at_period_end: atPeriodEnd, reason },
    }),
  reactivate: (tenantId: string) =>
    request<{ subscription: TenantSubscription }>(`${BASE}/tenants/${tenantId}/subscription/reactivate`, { method: 'POST' }),
  billingEvents: (tenantId: string) =>
    request<{ events: BillingEvent[] }>(`${BASE}/tenants/${tenantId}/billing-events`),

  featureFlagCatalog: () => request<{ flags: FeatureFlagCatalogEntry[]; timestamp: string }>(`${BASE}/feature-flags`),
  tenantFeatureFlags: (tenantId: string) =>
    request<{ tenant_id: string; billing_tier: BillingTier; flags: ResolvedFeatureFlag[]; timestamp: string }>(
      `${BASE}/tenants/${tenantId}/feature-flags`,
    ),
  setTenantFeatureFlag: (tenantId: string, key: string, enabled: boolean) =>
    request<{ flag: unknown }>(`${BASE}/tenants/${tenantId}/feature-flags/${key}`, {
      method: 'PATCH', body: { enabled },
    }),
  resetTenantFeatureFlag: (tenantId: string, key: string) =>
    request<{ ok: boolean }>(`${BASE}/tenants/${tenantId}/feature-flags/${key}/reset`, { method: 'POST' }),
};

// ── Platform analytics (analytics-router.ts) ─────────────────────────────────

export const analytics = {
  summary: () => request<AnalyticsSummary>(`${BASE}/analytics`),
};

// ── Platform-staff RBAC, kill-sessions, health, errors, rate limits ────────
// (platform-ops-router.ts)

export const platformOps = {
  listStaff: () => request<{ staff: PlatformStaffRow[] }>(`${BASE}/staff`),
  grantStaff: (email: string, platformRole: 'SUPPORT' | 'BILLING_ADMIN' | 'SUPERADMIN') =>
    request<{ ok: boolean }>(`${BASE}/staff/grant`, { method: 'POST', body: { email, platform_role: platformRole } }),
  revokeStaff: (email: string) =>
    request<{ ok: boolean }>(`${BASE}/staff/revoke`, { method: 'POST', body: { email } }),

  killTenantSessions: (tenantId: string, reason: string) =>
    request<{ user_count: number }>(`${BASE}/tenants/${tenantId}/kill-sessions`, { method: 'POST', body: { reason } }),
  killAllSessions: (reason: string) =>
    request<{ user_count: number }>(`${BASE}/kill-all-sessions`, {
      method: 'POST', body: { confirm: 'KILL ALL SESSIONS', reason },
    }),

  health: () => request<PlatformHealth>(`${BASE}/health`),
  errorLog: (filters?: { service?: string; min_status?: number; since?: string }) => {
    const params = new URLSearchParams();
    if (filters?.service) params.set('service', filters.service);
    if (filters?.min_status) params.set('min_status', String(filters.min_status));
    if (filters?.since) params.set('since', filters.since);
    const qs = params.toString();
    return request<{ errors: PlatformErrorLogEntry[] }>(`${BASE}/error-log${qs ? `?${qs}` : ''}`);
  },

  rateLimits: () => request<{ rate_limits: TenantRateLimit[] }>(`${BASE}/rate-limits`),
  setRateLimit: (tenantId: string, maxRequests: number, windowSeconds: number, reason: string) =>
    request<{ rate_limit: TenantRateLimit }>(`${BASE}/tenants/${tenantId}/rate-limit`, {
      method: 'PATCH', body: { max_requests: maxRequests, window_seconds: windowSeconds, reason },
    }),
  resetRateLimit: (tenantId: string) =>
    request<{ ok: boolean }>(`${BASE}/tenants/${tenantId}/rate-limit/reset`, { method: 'POST' }),
};

// ── Global settings, announcements, read-only support tokens ───────────────
// (settings-router.ts + public-announcements-router.ts)

export const settings = {
  get: () => request<{ settings: PlatformSettings }>(`${BASE}/settings`),
  update: (patch: Partial<Pick<PlatformSettings, 'default_currency' | 'default_timezone' | 'maintenance_mode' | 'maintenance_message'>>) =>
    request<{ settings: PlatformSettings }>(`${BASE}/settings`, { method: 'PATCH', body: patch }),

  listAnnouncements: () => request<{ announcements: AnnouncementRow[] }>(`${BASE}/announcements`),
  createAnnouncement: (message: string, level: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO', endsAt?: string) =>
    request<{ announcement: AnnouncementRow }>(`${BASE}/announcements`, {
      method: 'POST', body: { message, level, ends_at: endsAt },
    }),
  deactivateAnnouncement: (id: string) =>
    request<{ ok: boolean }>(`${BASE}/announcements/${id}/deactivate`, { method: 'POST' }),
  /** Public — no auth. What every tenant frontend would poll for a banner. */
  activeAnnouncements: () =>
    request<{ announcements: Array<Pick<AnnouncementRow, 'id' | 'message' | 'level' | 'starts_at' | 'ends_at'>> }>(
      `${BASE}/announcements/active`,
      { auth: false },
    ),

  issueSupportToken: (tenantId: string, reason: string, ttlMinutes?: number) =>
    request<{ token: string; expires_at: string; id: string; message: string }>(
      `${BASE}/tenants/${tenantId}/support-token`,
      { method: 'POST', body: { reason, ttl_minutes: ttlMinutes } },
    ),
  listSupportTokens: (tenantId: string) =>
    request<{ tokens: SupportTokenRow[] }>(`${BASE}/tenants/${tenantId}/support-tokens`),
  revokeSupportToken: (id: string) =>
    request<{ ok: boolean }>(`${BASE}/support-tokens/${id}/revoke`, { method: 'POST' }),
};
