'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, X, ShieldAlert, ShieldCheck, Trash2, Skull,
  KeySquare, LogOut, RefreshCw, Copy, Check, CheckCircle2,
} from 'lucide-react';
import { tenants, subscriptions, platformOps, settings } from '@/lib/superadmin-api';
import type {
  TenantRow, TenantSubscription, BillingEvent, ResolvedFeatureFlag,
  BillingTier, TenantRateLimit, SupportTokenRow,
} from '@/lib/superadmin-api';
import { formatCents, formatDate, formatRelative, humanize } from '@/lib/format';
import { useAuth } from '@/app/context/AuthContext';
import {
  Panel, Pill, AppButton, LightField, LightSelect, NoticeBanner, SectionTitle,
  ErrorBanner, type PillColor, type Notice,
} from '../_ui';

const STATUS_COLOR: Record<TenantRow['status'], PillColor> = {
  ACTIVE: 'green', SUSPENDED: 'amber', DELETED: 'red', PENDING_APPROVAL: 'blue',
};

const TIER_OPTIONS: { value: BillingTier; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'premium', label: 'Premium' },
  { value: 'business', label: 'Business' },
  { value: 'business_premium', label: 'Business Premium' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const { user } = useAuth();
  const canWrite = user?.permissions.includes('superadmin:access') ?? false;
  const canBill = canWrite || (user?.permissions.includes('platform:billing') ?? false);

  const [rows, setRows] = useState<TenantRow[]>([]);
  const [rateLimits, setRateLimits] = useState<TenantRateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TenantRow['status']>('ALL');
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [tenantsRes, rateLimitsRes] = await Promise.all([
        tenants.list(),
        canBill ? platformOps.rateLimits() : Promise.resolve({ rate_limits: [] as TenantRateLimit[] }),
      ]);
      setRows(tenantsRes.tenants);
      setRateLimits(rateLimitsRes.rate_limits);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [canBill]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.id.includes(q);
    });
  }, [rows, query, statusFilter]);

  // Keep the drawer's tenant row in sync with the list after a mutation.
  const refreshSelected = useCallback((updated: TenantRow) => {
    setSelected(updated);
    setRows((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  return (
    <div className="p-5 sm:p-7 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Tenants</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">{rows.length} stores provisioned on the platform.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200/70 bg-white/70 hover:bg-white hover:text-[#0052ff] transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug, or id…"
            className="w-full bg-white/70 border border-zinc-200/80 rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-[#0b1e33] placeholder-zinc-400 outline-none focus:bg-white focus:border-[#0052ff]/50 focus:ring-4 focus:ring-[#0052ff]/8"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                statusFilter === s ? 'bg-white text-[#0052ff] shadow-sm border border-zinc-200/60' : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {listError && <ErrorBanner text={listError} />}

      <Panel padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                <th className="px-4 py-3.5">Tenant</th>
                <th className="px-4 py-3.5">Tier</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#0052ff]/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-zinc-900">{t.name}</div>
                    <div className="text-[11px] font-mono text-zinc-400">{t.slug}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill color="blue">{TIER_OPTIONS.find((o) => o.value === t.billing_tier)?.label ?? t.billing_tier}</Pill>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill color={STATUS_COLOR[t.status]} dot>{t.status}</Pill>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-500">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <AppButton size="sm" variant="ghost" onClick={() => setSelected(t)}>Manage</AppButton>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-400 text-[13px]">No tenants match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <TenantDrawer
          tenant={selected}
          rateLimit={rateLimits.find((r) => r.tenant_id === selected.id) ?? null}
          canWrite={canWrite}
          canBill={canBill}
          onClose={() => setSelected(null)}
          onUpdated={refreshSelected}
          onRateLimitsChanged={setRateLimits}
        />
      )}
    </div>
  );
}

// ─── Tenant management drawer ──────────────────────────────────────────────

function TenantDrawer({
  tenant, rateLimit, canWrite, canBill, onClose, onUpdated, onRateLimitsChanged,
}: {
  tenant: TenantRow;
  rateLimit: TenantRateLimit | null;
  canWrite: boolean;
  canBill: boolean;
  onClose: () => void;
  onUpdated: (t: TenantRow) => void;
  onRateLimitsChanged: React.Dispatch<React.SetStateAction<TenantRateLimit[]>>;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-[#0b1e33]/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[600px] h-full bg-[#FBFCFE] border-l border-white/60 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-black text-[#0A0A0A] tracking-tight">{tenant.name}</h2>
              <Pill color={STATUS_COLOR[tenant.status]} dot>{tenant.status}</Pill>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{tenant.slug} · {tenant.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 flex items-center justify-center shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-7">
          <LifecycleSection tenant={tenant} canWrite={canWrite} onUpdated={onUpdated} />
          <TierSection tenant={tenant} canBill={canBill} onUpdated={onUpdated} />
          <SubscriptionSection tenant={tenant} canBill={canBill} />
          <FeatureFlagsSection tenant={tenant} canBill={canBill} />
          <RateLimitSection tenant={tenant} current={rateLimit} canWrite={canWrite} onChanged={onRateLimitsChanged} />
          <SessionsSection tenant={tenant} canWrite={canWrite} />
          <SupportTokensSection tenant={tenant} canWrite={canWrite} />
        </div>
      </div>
    </div>
  );
}

// ─── Lifecycle: suspend / unblock / soft-delete / purge ────────────────────

function LifecycleSection({
  tenant, canWrite, onUpdated,
}: { tenant: TenantRow; canWrite: boolean; onUpdated: (t: TenantRow) => void }) {
  const [reason, setReason] = useState('');
  const [confirmSlug, setConfirmSlug] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function run(action: string, fn: () => Promise<{ tenant: TenantRow }>) {
    setBusy(action);
    setNotice(null);
    try {
      const res = await fn();
      onUpdated(res.tenant);
      setReason('');
      setConfirmSlug('');
      setNotice({ kind: 'success', text: `${humanize(action)} applied.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : `Failed to ${action.toLowerCase()}` });
    } finally {
      setBusy(null);
    }
  }

  if (!canWrite) {
    return (
      <div>
        <SectionTitle>Lifecycle</SectionTitle>
        <p className="text-[12.5px] text-zinc-400">Read-only — requires full superadmin access.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Lifecycle</SectionTitle>
      <div className="space-y-3">
        <NoticeBanner notice={notice} />
        {tenant.status !== 'DELETED' && (
          <LightField label="Reason (required for suspend / delete)" value={reason} onChange={setReason} placeholder="e.g. Chargeback dispute, ToS violation…" />
        )}
        <div className="flex flex-wrap gap-2">
          {tenant.status === 'PENDING_APPROVAL' && (
            <AppButton size="sm" variant="primary" icon={<CheckCircle2 size={14} />} loading={busy === 'APPROVE'}
              onClick={() => run('APPROVE', () => tenants.approve(tenant.id))}>
              Approve
            </AppButton>
          )}
          {tenant.status === 'ACTIVE' && (
            <AppButton size="sm" variant="danger" icon={<ShieldAlert size={14} />} loading={busy === 'SUSPEND'}
              disabled={!reason.trim()} onClick={() => run('SUSPEND', () => tenants.suspend(tenant.id, reason))}>
              Suspend
            </AppButton>
          )}
          {tenant.status === 'SUSPENDED' && (
            <AppButton size="sm" variant="primary" icon={<ShieldCheck size={14} />} loading={busy === 'UNBLOCK'}
              onClick={() => run('UNBLOCK', () => tenants.unblock(tenant.id))}>
              Unblock
            </AppButton>
          )}
          {tenant.status !== 'DELETED' && (
            <AppButton size="sm" variant="danger" icon={<Trash2 size={14} />} loading={busy === 'SOFT_DELETE'}
              disabled={!reason.trim()} onClick={() => run('SOFT_DELETE', () => tenants.softDelete(tenant.id, reason))}>
              Soft delete
            </AppButton>
          )}
        </div>

        {tenant.status === 'DELETED' && (
          <div className="pt-2 border-t border-zinc-200/60 space-y-2.5">
            <p className="text-[12px] text-red-600/90">
              Hard purge permanently removes this tenant and everything tied to it (users, sales, inventory, ledgers). This cannot be undone.
            </p>
            <LightField
              label={`Type "${tenant.slug}" to confirm purge`}
              value={confirmSlug}
              onChange={setConfirmSlug}
              mono
            />
            <AppButton
              size="sm" variant="danger" icon={<Skull size={14} />}
              loading={busy === 'PURGE'}
              disabled={confirmSlug !== tenant.slug}
              onClick={async () => {
                setBusy('PURGE');
                setNotice(null);
                try {
                  await tenants.purge(tenant.id, confirmSlug);
                  setNotice({ kind: 'success', text: 'Tenant permanently purged.' });
                  onUpdated({ ...tenant, status: 'DELETED' });
                } catch (err) {
                  setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to purge' });
                } finally {
                  setBusy(null);
                }
              }}
            >
              Permanently purge
            </AppButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Plan / tier ─────────────────────────────────────────────────────────────

function TierSection({
  tenant, canBill, onUpdated,
}: { tenant: TenantRow; canBill: boolean; onUpdated: (t: TenantRow) => void }) {
  const [tier, setTier] = useState<BillingTier>(tenant.billing_tier);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => { setTier(tenant.billing_tier); }, [tenant.billing_tier]);

  return (
    <div>
      <SectionTitle>Plan tier</SectionTitle>
      <NoticeBanner notice={notice} />
      <div className="flex items-end gap-2.5 mt-2">
        <div className="flex-1">
          <LightSelect label="Billing tier" value={tier} onChange={(v) => setTier(v as BillingTier)} options={TIER_OPTIONS} disabled={!canBill} />
        </div>
        <AppButton
          size="sm" loading={busy} disabled={!canBill || tier === tenant.billing_tier}
          onClick={async () => {
            setBusy(true); setNotice(null);
            try {
              await subscriptions.changePlan(tenant.id, tier);
              onUpdated({ ...tenant, billing_tier: tier });
              setNotice({ kind: 'success', text: 'Plan updated.' });
            } catch (err) {
              setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to change plan' });
            } finally {
              setBusy(false);
            }
          }}
        >
          Apply
        </AppButton>
      </div>
      {!canBill && <p className="text-[11px] text-zinc-400 mt-1.5">Requires billing or superadmin access.</p>}
    </div>
  );
}

// ─── Subscription: status / billing events / cancel / reactivate ──────────

function SubscriptionSection({ tenant, canBill }: { tenant: TenantRow; canBill: boolean }) {
  const [sub, setSub] = useState<TenantSubscription | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [atPeriodEnd, setAtPeriodEnd] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [subRes, eventsRes] = await Promise.all([
        subscriptions.get(tenant.id),
        subscriptions.billingEvents(tenant.id),
      ]);
      setSub(subRes.subscription);
      setEvents(eventsRes.events);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle>Subscription & billing</SectionTitle>
      <NoticeBanner notice={notice} />
      {loading ? (
        <p className="text-[12.5px] text-zinc-400">Loading…</p>
      ) : notFound || !sub ? (
        <p className="text-[12.5px] text-zinc-400">No subscription record for this tenant.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <div>
              <span className="text-zinc-900 font-bold">{sub.plan_name}</span>
              <span className="text-zinc-400 ml-2">{formatCents(sub.price_cents)}/{sub.billing_interval === 'annual' ? 'yr' : 'mo'}</span>
            </div>
            <Pill color={sub.status === 'ACTIVE' ? 'green' : sub.status === 'PAST_DUE' ? 'amber' : sub.status === 'CANCELLED' ? 'red' : 'blue'}>
              {sub.status}
            </Pill>
          </div>
          <div className="text-[12px] text-zinc-500 grid grid-cols-2 gap-1.5">
            {sub.trial_ends_at && <span>Trial ends: {formatDate(sub.trial_ends_at)}</span>}
            {sub.current_period_end && <span>Period ends: {formatDate(sub.current_period_end)}</span>}
            {sub.cancel_at_period_end && <span className="text-amber-600">Cancels at period end</span>}
            {sub.canceled_at && <span>Cancelled: {formatDate(sub.canceled_at)}</span>}
          </div>

          {canBill && sub.status !== 'CANCELLED' && !sub.cancel_at_period_end && (
            <div className="pt-2 border-t border-zinc-200/60 space-y-2">
              <div className="flex items-center gap-4 text-[12.5px] text-zinc-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={atPeriodEnd} onChange={() => setAtPeriodEnd(true)} /> At period end
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={!atPeriodEnd} onChange={() => setAtPeriodEnd(false)} /> Immediately
                </label>
              </div>
              <LightField label="Reason (optional)" value={cancelReason} onChange={setCancelReason} />
              <AppButton
                size="sm" variant="danger" loading={busy === 'cancel'}
                onClick={async () => {
                  setBusy('cancel'); setNotice(null);
                  try {
                    await subscriptions.cancel(tenant.id, atPeriodEnd, cancelReason || undefined);
                    setNotice({ kind: 'success', text: 'Subscription cancellation recorded.' });
                    await load();
                  } catch (err) {
                    setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to cancel' });
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Cancel subscription
              </AppButton>
            </div>
          )}

          {canBill && (sub.status === 'CANCELLED' || sub.cancel_at_period_end) && (
            <AppButton
              size="sm" loading={busy === 'reactivate'}
              onClick={async () => {
                setBusy('reactivate'); setNotice(null);
                try {
                  await subscriptions.reactivate(tenant.id);
                  setNotice({ kind: 'success', text: 'Subscription reactivated.' });
                  await load();
                } catch (err) {
                  setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to reactivate' });
                } finally {
                  setBusy(null);
                }
              }}
            >
              Reactivate
            </AppButton>
          )}

          {events.length > 0 && (
            <div className="pt-2 border-t border-zinc-200/60">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Billing events</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {events.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-[11.5px]">
                    <span className="text-zinc-600">{humanize(e.event_type)}</span>
                    <span className="text-zinc-400">{formatRelative(e.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Feature flags (per-tenant overrides) ──────────────────────────────────

function FeatureFlagsSection({ tenant, canBill }: { tenant: TenantRow; canBill: boolean }) {
  const [flags, setFlags] = useState<ResolvedFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscriptions.tenantFeatureFlags(tenant.id);
      setFlags(res.flags);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to load feature flags' });
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle>Feature flags</SectionTitle>
      <NoticeBanner notice={notice} />
      {loading ? (
        <p className="text-[12.5px] text-zinc-400">Loading…</p>
      ) : (
        <div className="space-y-1.5">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-zinc-800 font-medium">{f.key}</span>
                  {f.is_override && <Pill color="amber">override</Pill>}
                </div>
                {f.description && <p className="text-[11px] text-zinc-400 truncate">{f.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {f.is_override && canBill && (
                  <button
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 underline"
                    disabled={busyKey === f.key}
                    onClick={async () => {
                      setBusyKey(f.key); setNotice(null);
                      try {
                        await subscriptions.resetTenantFeatureFlag(tenant.id, f.key);
                        await load();
                      } catch (err) {
                        setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to reset flag' });
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                  >
                    reset
                  </button>
                )}
                <button
                  role="switch"
                  aria-checked={f.enabled}
                  disabled={!canBill || busyKey === f.key}
                  onClick={async () => {
                    setBusyKey(f.key); setNotice(null);
                    try {
                      await subscriptions.setTenantFeatureFlag(tenant.id, f.key, !f.enabled);
                      await load();
                    } catch (err) {
                      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update flag' });
                    } finally {
                      setBusyKey(null);
                    }
                  }}
                  className={`w-9 h-5 rounded-full relative transition-colors disabled:opacity-40 ${f.enabled ? 'bg-[#0052ff]' : 'bg-zinc-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${f.enabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rate limit override ────────────────────────────────────────────────────

function RateLimitSection({
  tenant, current, canWrite, onChanged,
}: {
  tenant: TenantRow;
  current: TenantRateLimit | null;
  canWrite: boolean;
  onChanged: React.Dispatch<React.SetStateAction<TenantRateLimit[]>>;
}) {
  const [maxRequests, setMaxRequests] = useState(String(current?.max_requests ?? 100));
  const [windowSeconds, setWindowSeconds] = useState(String(current?.window_seconds ?? 60));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  return (
    <div>
      <SectionTitle>API rate limit override</SectionTitle>
      <NoticeBanner notice={notice} />
      {current && (
        <p className="text-[12px] text-zinc-500 mb-2">
          Current: <span className="font-mono text-zinc-700">{current.max_requests} req / {current.window_seconds}s</span>
          {current.reason && <span className="text-zinc-400"> — {current.reason}</span>}
        </p>
      )}
      {canWrite ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <LightField label="Max requests" value={maxRequests} onChange={setMaxRequests} inputMode="numeric" />
            <LightField label="Window (seconds)" value={windowSeconds} onChange={setWindowSeconds} inputMode="numeric" />
          </div>
          <LightField label="Reason" value={reason} onChange={setReason} placeholder="e.g. Suspected scraping" />
          <div className="flex gap-2">
            <AppButton
              size="sm" loading={busy === 'set'}
              disabled={!reason.trim() || !Number(maxRequests) || !Number(windowSeconds)}
              onClick={async () => {
                setBusy('set'); setNotice(null);
                try {
                  const res = await platformOps.setRateLimit(tenant.id, Number(maxRequests), Number(windowSeconds), reason);
                  onChanged((prev) => [res.rate_limit, ...prev.filter((r) => r.tenant_id !== tenant.id)]);
                  setNotice({ kind: 'success', text: 'Rate limit override applied.' });
                } catch (err) {
                  setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to set rate limit' });
                } finally {
                  setBusy(null);
                }
              }}
            >
              Apply override
            </AppButton>
            {current && (
              <AppButton
                size="sm" variant="ghost" loading={busy === 'reset'}
                onClick={async () => {
                  setBusy('reset'); setNotice(null);
                  try {
                    await platformOps.resetRateLimit(tenant.id);
                    onChanged((prev) => prev.filter((r) => r.tenant_id !== tenant.id));
                    setNotice({ kind: 'success', text: 'Reverted to the platform default.' });
                  } catch (err) {
                    setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to reset' });
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Revert to default
              </AppButton>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[12.5px] text-zinc-400">Requires full superadmin access.</p>
      )}
    </div>
  );
}

// ─── Session kill ────────────────────────────────────────────────────────────

function SessionsSection({ tenant, canWrite }: { tenant: TenantRow; canWrite: boolean }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!canWrite) return null;

  return (
    <div>
      <SectionTitle>Sessions</SectionTitle>
      <NoticeBanner notice={notice} />
      <p className="text-[12px] text-zinc-500 mb-2">
        Force every cashier/manager at this tenant to sign back in. Does not change tenant status.
      </p>
      <LightField label="Reason" value={reason} onChange={setReason} placeholder="e.g. Suspected compromised device" />
      <AppButton
        size="sm" variant="danger" icon={<LogOut size={14} />} className="mt-2.5"
        loading={busy} disabled={!reason.trim()}
        onClick={async () => {
          setBusy(true); setNotice(null);
          try {
            const res = await platformOps.killTenantSessions(tenant.id, reason);
            setNotice({ kind: 'success', text: `Signed out ${res.user_count} user(s).` });
            setReason('');
          } catch (err) {
            setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to kill sessions' });
          } finally {
            setBusy(false);
          }
        }}
      >
        Kill all sessions for this tenant
      </AppButton>
    </div>
  );
}

// ─── Support-impersonation tokens ───────────────────────────────────────────

function SupportTokensSection({ tenant, canWrite }: { tenant: TenantRow; canWrite: boolean }) {
  const [tokens, setTokens] = useState<SupportTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [ttl, setTtl] = useState('30');
  const [issued, setIssued] = useState<{ token: string; expires_at: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settings.listSupportTokens(tenant.id);
      setTokens(res.support_tokens ?? []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  if (!canWrite) return null;

  return (
    <div>
      <SectionTitle>Read-only support access</SectionTitle>
      <NoticeBanner notice={notice} />
      <p className="text-[12px] text-zinc-500 mb-2.5">
        Issue a short-lived, view-only token for support staff to inspect this tenant without sharing its owner's credentials. Every issuance and use is audit-logged.
      </p>

      {issued && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/50 space-y-1.5">
          <p className="text-[11px] text-amber-700">Save this now — it will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono text-zinc-800 bg-white/70 rounded px-2 py-1.5 truncate border border-amber-200/40">{issued.token}</code>
            <button
              className="text-zinc-500 hover:text-zinc-800"
              onClick={() => { navigator.clipboard.writeText(issued.token); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">Expires {formatDate(issued.expires_at)}</p>
        </div>
      )}

      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <LightField label="Reason" value={reason} onChange={setReason} placeholder="e.g. Debugging sync issue for owner" />
        </div>
        <div className="w-24">
          <LightField label="TTL (min)" value={ttl} onChange={setTtl} inputMode="numeric" />
        </div>
        <AppButton
          size="sm" icon={<KeySquare size={14} />} loading={busy === 'issue'}
          disabled={!reason.trim()}
          onClick={async () => {
            setBusy('issue'); setNotice(null);
            try {
              const res = await settings.issueSupportToken(tenant.id, reason, Number(ttl) || 30);
              setIssued({ token: res.token, expires_at: res.expires_at });
              setReason('');
              await load();
            } catch (err) {
              setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to issue token' });
            } finally {
              setBusy(null);
            }
          }}
        >
          Issue
        </AppButton>
      </div>

      {!loading && tokens.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {tokens.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-[11.5px] py-1">
              <div className="min-w-0 flex items-center gap-2">
                <Pill color={t.revoked_at ? 'zinc' : new Date(t.expires_at) < new Date() ? 'red' : 'green'}>
                  {t.revoked_at ? 'revoked' : new Date(t.expires_at) < new Date() ? 'expired' : 'active'}
                </Pill>
                <span className="text-zinc-400 truncate">{t.reason}</span>
              </div>
              {!t.revoked_at && (
                <button
                  className="text-zinc-400 hover:text-red-500 underline shrink-0"
                  disabled={busy === t.id}
                  onClick={async () => {
                    setBusy(t.id);
                    try {
                      await settings.revokeSupportToken(t.id);
                      await load();
                    } catch (err) {
                      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to revoke' });
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
