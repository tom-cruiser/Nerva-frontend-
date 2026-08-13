'use client';

import React, { useCallback, useEffect, useState } from 'react';
import RequireRole from '@/components/RequireRole';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { subscription } from '@/lib/endpoints';
import type { TenantSubscriptionResponse } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatCents, formatDate } from '@/lib/format';
import { TIER_LABELS } from '@/lib/types';
import type { BillingTier } from '@/lib/types';
import { onRealtimeEvent } from '@/lib/realtime';
import { CreditCard, Clock, CheckCircle2, ArrowUpRight } from 'lucide-react';

const PLAN_ORDER: BillingTier[] = ['starter', 'premium', 'business', 'business_premium'];
const BILLING_CYCLES = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'semestral' as const, label: 'Semestral (6 months)' },
  { value: 'annual' as const, label: 'Annual' },
];

const STATUS_BADGE: Record<string, { color: 'green' | 'amber' | 'red' | 'blue' | 'zinc'; label: string }> = {
  TRIALING:  { color: 'blue',  label: 'Trial' },
  ACTIVE:    { color: 'green', label: 'Active' },
  PAST_DUE:  { color: 'amber', label: 'Past Due' },
  CANCELLED: { color: 'red',   label: 'Cancelled' },
};

export default function SubscriptionPage() {
  const [data, setData] = useState<TenantSubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<BillingTier>('premium');
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'semestral' | 'annual'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await subscription.get();
      setData(res);
      // Default the picker to the next tier up from whatever the tenant is
      // currently on, so the form never opens pre-selected on the tenant's
      // own current plan.
      const currentIdx = PLAN_ORDER.indexOf(res.subscription.planCode);
      setSelectedPlan(PLAN_ORDER[Math.min(currentIdx + 1, PLAN_ORDER.length - 1)]);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load subscription details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates — a Super Admin approving/declining this tenant's request
  // (or changing its plan directly) reaches this page instantly, no refresh.
  useEffect(() => {
    const offUpdated = onRealtimeEvent('subscription:updated', () => load());
    const offRejected = onRealtimeEvent('subscription:request_rejected', () => load());
    return () => { offUpdated(); offRejected(); };
  }, [load]);

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      await subscription.request(selectedPlan, selectedCycle);
      setSubmitSuccess(true);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to submit upgrade request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['OWNER']}>
      <div className="p-4 sm:p-7 space-y-6 max-w-[900px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">

        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-[#0A0A0A] tracking-tight">Billing &amp; Subscription</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-500 mt-0.5">
            Your plan, resource limits, and upgrade requests.
          </p>
        </div>

        {loadError && (
          <div className="text-[12.5px] font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-xl px-4 py-2.5">
            {loadError}
          </div>
        )}

        {data && (
          <>
            {/* Current plan */}
            <Card padding="lg">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Current Plan</p>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">
                      {data.plan?.name ?? TIER_LABELS[data.subscription.planCode]}
                    </h2>
                    <Badge
                      color={STATUS_BADGE[data.subscription.status]?.color ?? 'zinc'}
                      dot
                    >
                      {STATUS_BADGE[data.subscription.status]?.label ?? data.subscription.status}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-1.5">
                    {data.plan ? `${formatCents(data.plan.price_cents)} / ${data.subscription.billingCycle}` : '—'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#0052ff]/10 flex items-center justify-center text-[#0052ff] shrink-0">
                  <CreditCard size={20} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-200/60">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cashiers</p>
                  <p className="text-lg font-bold text-zinc-800 font-mono mt-0.5">{data.plan?.max_cashiers ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Locations</p>
                  <p className="text-lg font-bold text-zinc-800 font-mono mt-0.5">{data.plan?.max_locations ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tx / Month</p>
                  <p className="text-lg font-bold text-zinc-800 font-mono mt-0.5">{data.plan?.max_monthly_transactions ?? '∞'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {data.subscription.status === 'TRIALING' ? 'Trial Ends In' : 'Renews In'}
                  </p>
                  <p className="text-lg font-bold text-[#0052ff] font-mono mt-0.5 flex items-center gap-1.5">
                    <Clock size={14} />
                    {data.subscription.daysRemaining !== null ? `${data.subscription.daysRemaining}d` : '—'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Pending request or upgrade form */}
            {data.pendingRequest ? (
              <Card padding="lg" className="border-amber-200/60 bg-amber-50/40">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Upgrade request pending review</p>
                    <p className="text-[13px] text-zinc-600 mt-1">
                      Requested <strong>{TIER_LABELS[data.pendingRequest.planCode]}</strong> ({data.pendingRequest.billingCycle}) on{' '}
                      {formatDate(data.pendingRequest.createdAt)}. A Super Admin will approve or decline it shortly — this page
                      updates automatically the moment they do.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padding="lg">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                  <ArrowUpRight className="text-[#0052ff]" size={14} strokeWidth={2.5} />
                  Request an Upgrade
                </h3>

                {submitSuccess && (
                  <div className="mb-4 text-[13px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <CheckCircle2 size={15} /> Request submitted — awaiting Super Admin review.
                  </div>
                )}
                {submitError && (
                  <div className="mb-4 text-[13px] font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-xl px-4 py-2.5">
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Plan</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value as BillingTier)}
                      className="w-full rounded-lg border border-muted bg-white text-[14px] px-3 py-2 outline-none focus:ring-2 focus:ring-pulse/30 focus:border-pulse/50"
                    >
                      {PLAN_ORDER.filter((p) => p !== data.subscription.planCode).map((p) => (
                        <option key={p} value={p}>{TIER_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Billing Cycle</label>
                    <select
                      value={selectedCycle}
                      onChange={(e) => setSelectedCycle(e.target.value as typeof selectedCycle)}
                      className="w-full rounded-lg border border-muted bg-white text-[14px] px-3 py-2 outline-none focus:ring-2 focus:ring-pulse/30 focus:border-pulse/50"
                    >
                      {BILLING_CYCLES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  className="mt-5 bg-[#0052ff] hover:bg-[#003bbf] text-white"
                  loading={isSubmitting}
                  onClick={handleSubmitRequest}
                >
                  Submit Upgrade Request
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </RequireRole>
  );
}
