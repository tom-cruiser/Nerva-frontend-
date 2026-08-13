'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, Users, Percent, ShoppingBag, UserPlus, RefreshCw,
  Database, Server, MessageCircle,
} from 'lucide-react';
import { analytics, platformOps, tenants } from '@/lib/superadmin-api';
import type { AnalyticsSummary, PlatformHealth, PlatformAuditLogEntry } from '@/lib/superadmin-api';
import { formatCents, formatPercent, formatRelative, humanize } from '@/lib/format';
import { Panel, StatTile, Pill, ErrorBanner } from './_ui';

/**
 * Platform Overview — the Super Admin Command Center's landing page.
 * Pulls live figures from analytics-router.ts (MRR/ARR/ARPU/churn/GMV),
 * platform-ops-router.ts (DB pool / Redis / WhatsApp gateway health), and
 * superadmin-router.ts's cross-tenant audit trail. Every number here is
 * real — there is deliberately no seeded/mock data on this page.
 */

// ─── 30-day transaction volume — single-series bar chart ──────────────────
// One series (transaction count), so no legend is needed — the card title
// already says what's plotted. Bars are capped at 24px, 4px rounded at the
// data end, square at the baseline, with a surface gap between them.

function TrendChart({ trend }: { trend: AnalyticsSummary['transaction_volume_trend'] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (trend.length === 0) {
    return <p className="text-[13px] text-zinc-500">No transaction activity in the last 30 days.</p>;
  }

  const max = Math.max(1, ...trend.map((t) => t.count));
  const chartHeight = 140;
  const barSlot = 100 / trend.length;

  return (
    <div className="relative">
      <div className="flex items-end gap-0" style={{ height: chartHeight }}>
        {trend.map((point, i) => {
          const heightPct = Math.max(2, (point.count / max) * 100);
          const isHover = hover === i;
          return (
            <div
              key={point.date}
              className="relative flex-1 flex items-end justify-center h-full group"
              style={{ maxWidth: `${barSlot}%` }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
              tabIndex={0}
            >
              <div
                className={`w-full max-w-[18px] mx-auto rounded-t-[4px] transition-colors duration-150 ${
                  isHover ? 'bg-[#0052ff]' : 'bg-[#0052ff]/45'
                }`}
                style={{ height: `${heightPct}%` }}
              />
              {isHover && (
                <div className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-xl bg-[#0b1e33] px-2.5 py-1.5 text-[11px] shadow-lg pointer-events-none">
                  <div className="font-mono text-slate-400">{point.date}</div>
                  <div className="text-white font-bold">{point.count.toLocaleString()} txns</div>
                  <div className="text-slate-300">{formatCents(point.amount_cents)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-px bg-zinc-200/70 mt-0" />
      <div className="flex justify-between mt-2 text-[10px] font-mono text-zinc-400">
        <span>{trend[0]?.date}</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Health status row ──────────────────────────────────────────────────────

function HealthRow({
  icon, label, ok, detail,
}: { icon: React.ReactNode; label: string; ok: boolean | null; detail: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-b-0">
      <div className="flex items-center gap-2.5 text-zinc-600">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-400">{detail}</span>
        <Pill color={ok === null ? 'zinc' : ok ? 'green' : 'red'} dot>
          {ok === null ? 'Unknown' : ok ? 'Healthy' : 'Down'}
        </Pill>
      </div>
    </div>
  );
}

export default function PlatformOverviewPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [auditEntries, setAuditEntries] = useState<PlatformAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [summaryRes, healthRes, auditRes] = await Promise.allSettled([
      analytics.summary(),
      platformOps.health(),
      tenants.auditLog(),
    ]);

    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
    if (auditRes.status === 'fulfilled') setAuditEntries(auditRes.value.entries.slice(0, 8));

    if (summaryRes.status === 'rejected' && healthRes.status === 'rejected') {
      setError('Unable to reach the superadmin service. Check that it is running and reachable through the gateway.');
    }
    setLastLoaded(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Platform Overview</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Live figures across every tenant on Nerva.
            {lastLoaded && <span className="ml-2 text-zinc-400">Updated {formatRelative(lastLoaded.toISOString())}</span>}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200/70 bg-white/70 hover:bg-white hover:text-[#0052ff] transition-all duration-200 disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <ErrorBanner text={error} />}

      {/* Financial + growth metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile label="MRR" value={formatCents(summary?.mrr_cents)} icon={<TrendingUp size={16} />} accent />
        <StatTile label="ARR" value={formatCents(summary?.arr_cents)} icon={<TrendingUp size={16} />} />
        <StatTile label="ARPU / mo" value={formatCents(summary?.arpu_cents)} icon={<Users size={16} />} />
        <StatTile
          label="Churn (30d)"
          value={formatPercent(summary?.churn_rate_30d)}
          icon={<Percent size={16} />}
        />
        <StatTile label="Active tenants" value={(summary?.active_tenants ?? 0).toLocaleString()} icon={<Users size={16} />} />
        <StatTile label="GMV (lifetime)" value={formatCents(summary?.gmv_lifetime_cents)} icon={<ShoppingBag size={16} />} />
        <StatTile label="GMV (30d)" value={formatCents(summary?.gmv_30d_cents)} icon={<ShoppingBag size={16} />} />
        <StatTile label="New signups (30d)" value={(summary?.new_signups_30d ?? 0).toLocaleString()} icon={<UserPlus size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend chart */}
        <Panel className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
            <TrendingUp className="text-[#0052ff]" size={14} strokeWidth={2.5} />
            Transaction volume — last 30 days
          </h3>
          {summary
            ? <TrendChart trend={summary.transaction_volume_trend} />
            : <div className="h-[140px] flex items-center justify-center text-zinc-400 text-[13px]">Loading…</div>}
        </Panel>

        {/* System health */}
        <Panel>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
            System health
          </h3>
          <HealthRow
            icon={<Database size={15} />}
            label="Database pool"
            ok={health ? health.database.waiting === 0 : null}
            detail={health ? `${health.database.total - health.database.idle}/${health.database.max} in use` : '—'}
          />
          <HealthRow
            icon={<Server size={15} />}
            label="Redis cache"
            ok={health ? health.redis.status === 'ready' : null}
            detail={health?.redis.latency_ms != null ? `${health.redis.latency_ms}ms` : health?.redis.status ?? '—'}
          />
          <HealthRow
            icon={<MessageCircle size={15} />}
            label="WhatsApp gateway"
            ok={health ? health.whatsapp_gateway.reachable : null}
            detail={health?.whatsapp_gateway.status ?? '—'}
          />
        </Panel>
      </div>

      {/* Recent platform activity */}
      <Panel>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
          Recent platform activity
        </h3>
        {auditEntries.length === 0 ? (
          <p className="text-[13px] text-zinc-500">{loading ? 'Loading…' : 'No superadmin actions recorded yet.'}</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Pill color="blue">{humanize(entry.action)}</Pill>
                  <span className="text-[13px] text-zinc-800 font-semibold truncate">{entry.tenant_name}</span>
                  {entry.reason && <span className="text-[12px] text-zinc-400 truncate hidden sm:inline">— {entry.reason}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">{entry.performed_by_email}</span>
                  <span className="text-[11px] text-zinc-400">{formatRelative(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
