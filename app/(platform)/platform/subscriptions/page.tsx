'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Pencil, Check, X, Clock } from 'lucide-react';
import { subscriptions, upgradeRequests } from '@/lib/superadmin-api';
import type { SubscriptionPlan, FeatureFlagCatalogEntry, BillingTier, SubscriptionRequestRow } from '@/lib/superadmin-api';
import { formatCents, formatDate } from '@/lib/format';
import { useAuth } from '@/app/context/AuthContext';
import { onRealtimeEvent } from '@/lib/realtime';
import { Panel, Pill, AppButton, LightField, NoticeBanner, ErrorBanner, type Notice } from '../_ui';

const TIER_LABEL: Record<BillingTier, string> = {
  starter: 'Starter', premium: 'Premium', business: 'Business', business_premium: 'Business Premium',
};

/**
 * Subscriptions — the platform-wide plan catalog and the global feature-flag
 * catalog (with per-plan defaults). Per-TENANT overrides (a single store's
 * plan, cancellation, or flag override) live in the tenant detail drawer on
 * /platform/tenants — this page is deliberately catalog-only.
 */
export default function SubscriptionsPage() {
  const { user } = useAuth();
  const canWrite = (user?.permissions.includes('superadmin:access') || user?.permissions.includes('platform:billing')) ?? false;

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [flags, setFlags] = useState<FeatureFlagCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, flagsRes] = await Promise.all([subscriptions.plans(), subscriptions.featureFlagCatalog()]);
      setPlans(plansRes.plans);
      setFlags(flagsRes.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Subscriptions</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Plan catalog, resource limits, and feature-flag defaults.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200/70 bg-white/70 hover:bg-white hover:text-[#0052ff] transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner text={error} />}

      <PendingUpgradeRequestsPanel canWrite={canWrite} />

      <Panel>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Plan catalog</h3>
        <div className="space-y-3">
          {plans.map((plan) => <PlanRow key={plan.code} plan={plan} canWrite={canWrite} onSaved={load} />)}
          {plans.length === 0 && !loading && <p className="text-[13px] text-zinc-400">No plans found.</p>}
        </div>
      </Panel>

      <Panel>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">Feature flags</h3>
        <p className="text-[12px] text-zinc-400 mb-4">
          Global catalog and per-plan defaults. Per-tenant overrides are managed from each tenant's detail panel.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.1em] border-b border-zinc-200/50">
                <th className="px-3 py-2">Flag</th>
                <th className="px-3 py-2">Global default</th>
                {(Object.keys(TIER_LABEL) as BillingTier[]).map((t) => (
                  <th key={t} className="px-3 py-2 text-center">{TIER_LABEL[t]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[13px]">
              {flags.map((f) => (
                <tr key={f.key}>
                  <td className="px-3 py-2.5">
                    <div className="text-zinc-800 font-medium">{f.key}</div>
                    {f.description && <div className="text-[11px] text-zinc-400">{f.description}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill color={f.default_enabled ? 'green' : 'zinc'}>{f.default_enabled ? 'on' : 'off'}</Pill>
                  </td>
                  {(Object.keys(TIER_LABEL) as BillingTier[]).map((t) => {
                    const planEnabled = f.plan_defaults[t];
                    return (
                      <td key={t} className="px-3 py-2.5 text-center">
                        {planEnabled === undefined ? (
                          <span className="text-zinc-300">·</span>
                        ) : planEnabled ? (
                          <Check size={14} className="inline text-emerald-600" />
                        ) : (
                          <X size={14} className="inline text-zinc-300" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {flags.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-400">No feature flags defined.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/**
 * The other direction from the tenant-drawer's per-tenant plan change on
 * /platform/tenants — a Shop Admin's own upgrade request
 * (services/auth-tenant's POST /api/v1/auth/subscription/request), approved
 * or declined here. Lives on this page (not the drawer) since it's not
 * scoped to a tenant the operator already picked — it's the inbound queue.
 */
function PendingUpgradeRequestsPanel({ canWrite }: { canWrite: boolean }) {
  const [requests, setRequests] = useState<SubscriptionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await upgradeRequests.list('PENDING');
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending upgrade requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live — another Super Admin approving/declining, or a new request coming
  // in, updates this queue for everyone watching without a manual refresh.
  useEffect(() => onRealtimeEvent('subscription:request_created', () => load()), [load]);
  useEffect(() => onRealtimeEvent('subscription:request_decided', () => load()), [load]);

  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-2">
          <Clock size={14} className="text-[#0052ff]" />
          Pending Upgrade Requests
        </h3>
        {requests.length > 0 && <Pill color="amber" dot>{requests.length} pending</Pill>}
      </div>

      {error && <ErrorBanner text={error} />}

      <div className="space-y-3">
        {requests.map((req) => (
          <UpgradeRequestRow key={req.id} request={req} canWrite={canWrite} onDecided={load} />
        ))}
        {requests.length === 0 && !loading && (
          <p className="text-[13px] text-zinc-400">No pending upgrade requests.</p>
        )}
      </div>
    </Panel>
  );
}

function UpgradeRequestRow({
  request, canWrite, onDecided,
}: { request: SubscriptionRequestRow; canWrite: boolean; onDecided: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approve = async () => {
    setBusy('approve'); setNotice(null);
    try {
      await upgradeRequests.approve(request.id);
      onDecided();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to approve request' });
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      setNotice({ kind: 'error', text: 'A reason is required to decline a request' });
      return;
    }
    setBusy('reject'); setNotice(null);
    try {
      await upgradeRequests.reject(request.id, rejectReason.trim());
      onDecided();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to reject request' });
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 text-[14px]">{request.tenant_name}</span>
            <span className="text-[11px] text-zinc-400 font-mono">{request.tenant_slug}</span>
          </div>
          <p className="text-[12.5px] text-zinc-500 mt-1">
            Requested <Pill color="blue">{TIER_LABEL[request.requested_plan_code]}</Pill> · {request.billing_cycle} ·{' '}
            by {request.requested_by_email ?? request.requested_by} on {formatDate(request.created_at)}
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2 shrink-0">
            <AppButton size="sm" loading={busy === 'approve'} disabled={busy !== null} onClick={approve}>
              Approve
            </AppButton>
            <AppButton
              size="sm" variant="danger" disabled={busy !== null}
              onClick={() => setShowRejectForm((v) => !v)}
            >
              Decline
            </AppButton>
          </div>
        )}
      </div>

      {notice && <div className="mt-2.5"><NoticeBanner notice={notice} /></div>}

      {showRejectForm && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <LightField
              label="Reason for declining"
              value={rejectReason}
              onChange={setRejectReason}
            />
          </div>
          <AppButton size="sm" variant="danger" loading={busy === 'reject'} onClick={reject}>
            Confirm Decline
          </AppButton>
        </div>
      )}
    </div>
  );
}

function PlanRow({
  plan, canWrite, onSaved,
}: { plan: SubscriptionPlan; canWrite: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(plan.price_cents / 100));
  const [maxCashiers, setMaxCashiers] = useState(plan.max_cashiers != null ? String(plan.max_cashiers) : '');
  const [maxLocations, setMaxLocations] = useState(plan.max_locations != null ? String(plan.max_locations) : '');
  const [maxTx, setMaxTx] = useState(plan.max_monthly_transactions != null ? String(plan.max_monthly_transactions) : '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function resetFields() {
    setPrice(String(plan.price_cents / 100));
    setMaxCashiers(plan.max_cashiers != null ? String(plan.max_cashiers) : '');
    setMaxLocations(plan.max_locations != null ? String(plan.max_locations) : '');
    setMaxTx(plan.max_monthly_transactions != null ? String(plan.max_monthly_transactions) : '');
  }

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-zinc-900 text-[14px]">{plan.name}</span>
          <Pill color="blue">{plan.billing_interval}</Pill>
        </div>
        {canWrite && !editing && (
          <AppButton size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>Edit</AppButton>
        )}
      </div>

      {notice && <div className="mt-2"><NoticeBanner notice={notice} /></div>}

      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <LightField label="Price (XAF)" value={price} onChange={setPrice} inputMode="decimal" />
          <LightField label="Max cashiers (blank = unlimited)" value={maxCashiers} onChange={setMaxCashiers} inputMode="numeric" />
          <LightField label="Max locations (blank = unlimited)" value={maxLocations} onChange={setMaxLocations} inputMode="numeric" />
          <LightField label="Max monthly transactions (blank = unlimited)" value={maxTx} onChange={setMaxTx} inputMode="numeric" />
          <div className="col-span-2 flex gap-2 mt-1">
            <AppButton
              size="sm" loading={busy}
              onClick={async () => {
                setBusy(true); setNotice(null);
                try {
                  await subscriptions.updatePlan(plan.code, {
                    price_cents: Math.round(Number(price || 0) * 100),
                    max_cashiers: maxCashiers.trim() === '' ? null : Number(maxCashiers),
                    max_locations: maxLocations.trim() === '' ? null : Number(maxLocations),
                    max_monthly_transactions: maxTx.trim() === '' ? null : Number(maxTx),
                  });
                  setEditing(false);
                  onSaved();
                } catch (err) {
                  setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to save plan' });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </AppButton>
            <AppButton size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(false); resetFields(); }}>Cancel</AppButton>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-zinc-500">
          <span><span className="text-zinc-400">Price:</span> {formatCents(plan.price_cents)}</span>
          <span><span className="text-zinc-400">Cashiers:</span> {plan.max_cashiers ?? 'Unlimited'}</span>
          <span><span className="text-zinc-400">Locations:</span> {plan.max_locations ?? 'Unlimited'}</span>
          <span><span className="text-zinc-400">Monthly transactions:</span> {plan.max_monthly_transactions ?? 'Unlimited'}</span>
        </div>
      )}
    </div>
  );
}
