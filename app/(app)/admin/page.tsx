'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import RequireRole from '@/components/RequireRole';
import { inventory, analytics, shifts } from '@/lib/endpoints';
import type { SalesReport } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { CurrentShift, NoOpenShift, StaffPerformanceEntry, Permission } from '@/lib/types';
import {
  Plus,
  ArrowUpRight,
  Smartphone,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronRight,
  MonitorDot,
  Clock,
} from 'lucide-react';

interface DashboardMetrics {
  report: SalesReport | null;
  registers: { active: number; total: number } | null;
  lowStockCount: number | null;
}

export default function TenantDashboard() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Cashiers (STAFF role) get their own dashboard — a shift/performance
  // overview + quick links to what their role (and any extra permissions an
  // Admin has granted them) actually allows, rather than admin-wide revenue
  // metrics they have no permission to see (reports:read/ledger:read are
  // deliberately excluded from STAFF's default permissions — admin3.md).
  if (status === 'authenticated' && user?.role === 'STAFF') {
    return (
      <RequireRole allowedRoles={['STAFF']}>
        <WorkerDashboard />
      </RequireRole>
    );
  }

  return <OwnerDashboard />;
}

function OwnerDashboard() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>({ report: null, registers: null, lowStockCount: null });
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Real dashboard data — replaces what used to be hardcoded mock numbers.
  // Each call is independent (Promise.allSettled) so one endpoint being down
  // doesn't blank out the metrics that did load.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);

    Promise.allSettled([
      analytics.getSalesReport(today, 'daily'),
      analytics.getRegisters(),
      inventory.listProducts(),
    ]).then(([reportRes, registersRes, productsRes]) => {
      if (!active) return;
      const next: DashboardMetrics = { report: null, registers: null, lowStockCount: null };
      const errors: string[] = [];

      if (reportRes.status === 'fulfilled') next.report = reportRes.value;
      else errors.push('sales report');

      if (registersRes.status === 'fulfilled') next.registers = registersRes.value;
      else errors.push('active registers');

      if (productsRes.status === 'fulfilled') {
        const products = productsRes.value.products ?? [];
        next.lowStockCount = products.filter(
          (p) => p.stock_quantity <= p.reorder_level,
        ).length;
      } else errors.push('inventory');

      setMetrics(next);
      setMetricsError(errors.length > 0 ? `Some metrics failed to load: ${errors.join(', ')}.` : null);
    });

    return () => { active = false; };
  }, [status]);

  return (
    <RequireRole allowedRoles={['OWNER', 'MANAGER', 'VIEWER']}>
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Console Dashboard</h1>
            <p className="text-[14px] text-zinc-500 mt-0.5">
              Workspace: <strong className="text-zinc-700">{user?.tenantId ? `Tenant ${user.tenantId.slice(0, 8)}…` : 'N/A'}</strong> · Role: <span className="text-[#0052ff] font-bold">{user?.role}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/pos')}
              className="bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.35)] flex items-center gap-2"
            >
              <Smartphone size={14} strokeWidth={2.5} />
              Open POS
            </button>
          </div>
        </div>

        {metricsError && (
          <div className="text-[12.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5">
            {metricsError}
          </div>
        )}

        {/* Metric widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

          {/* Main Stat Card - Corporate Blue Signature */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Gross Revenue (today)</p>
              <p className="text-3xl font-extrabold text-[#0052ff] tracking-tight font-mono">
                {metrics.report ? `XAF ${metrics.report.totalSales.toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="mt-2.5">
              <span className="text-[11px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-0.5 rounded-full border border-[#0052ff]/20 flex items-center gap-1 w-max">
                <ArrowUpRight size={10} strokeWidth={3} /> PAID sales, today
              </span>
            </div>
          </div>

          {/* Daily Transactions */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Daily Transactions</p>
              <p className="text-3xl font-extrabold text-[#0A0A0A] tracking-tight font-mono">
                {metrics.report ? metrics.report.totalOrders : '—'}
              </p>
              <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-zinc-200/30">Completed sales</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-100/50 border border-zinc-200/40 flex items-center justify-center text-zinc-500">
              <Receipt size={18} />
            </div>
          </div>

          {/* Active Registers */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Active Registers</p>
              <p className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">
                {metrics.registers ? `${metrics.registers.active} / ${metrics.registers.total}` : '—'}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-flex items-center gap-1.5 border border-emerald-200/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Synced in last 24h
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MonitorDot size={18} />
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Low Stock Warnings</p>
              <p className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono">
                {metrics.lowStockCount ?? '—'}
              </p>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-amber-200/30">Requires restock</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>

        {/* Content rows */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales Ledger */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                  <Receipt className="text-[#0052ff]" size={16} strokeWidth={2.5} />
                  Recent Transactions
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-1 rounded-full border border-[#0052ff]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0052ff] animate-pulse"></span>
                  LIVE SYNC
                </div>
              </div>

              <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                      <th className="py-4 px-4">Transaction</th>
                      <th className="py-4 px-4">Cashier</th>
                      <th className="py-4 px-4">Items</th>
                      <th className="py-4 px-4">Method</th>
                      <th className="py-4 px-4">Amount</th>
                      <th className="py-4 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                    {(metrics.report?.recentSales ?? []).map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#0052ff]/[0.02] transition-all cursor-default group">
                        <td className="py-4 px-4">
                          <p className="text-zinc-900 font-bold text-sm tracking-tight">{sale.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-zinc-400 font-mono font-semibold">{formatRelative(sale.saleTimestamp)}</p>
                        </td>
                        <td className="py-4 px-4 text-zinc-600 font-semibold">{sale.workerTag}</td>
                        <td className="py-4 px-4 font-mono text-zinc-500 font-semibold">{sale.itemCount} items</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-500 rounded-md border border-zinc-200/40 uppercase tracking-wider">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold font-mono text-[#0052ff] text-[13px]">
                          XAF {sale.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            sale.paymentStatus === 'PAID'
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/30'
                              : 'bg-amber-50/80 text-amber-700 border-amber-200/30'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${sale.paymentStatus === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {sale.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {metrics.report && metrics.report.recentSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-400 font-semibold text-xs">
                          No transactions yet today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                <Activity className="text-[#0052ff]" size={14} strokeWidth={2.5} />
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/inventory')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[#0052ff] group-hover:bg-[#0052ff]/10 transition-colors">
                      <Plus size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">Inventory Catalog</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Configure prices, reorder alerts</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/ledgers')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-200/50 transition-colors">
                      <Receipt size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">Customer Ledgers</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Monitor credit debt journals</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/whatsapp')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">WhatsApp Digest</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Configure automated summaries</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

// ─── Worker (STAFF) dashboard ────────────────────────────────────────────────

function isOpenShift(s: CurrentShift | NoOpenShift | null): s is CurrentShift {
  return !!s && s.status !== 'NO_OPEN_SHIFT';
}

/** Live HH:MM:SS ticker since `start` — mirrors app/(app)/shifts/page.tsx's Ticker. */
function ShiftTicker({ start }: { start: Date }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [start]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return <span className="font-mono text-[#0052ff]">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

interface QuickLink {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  iconWrapCls: string;
  /** Show only if the worker holds this permission (undefined = always). */
  permission?: Permission;
}

function WorkerDashboard() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();

  const [shift, setShift] = useState<CurrentShift | NoOpenShift | null>(null);
  const [myPerf, setMyPerf] = useState<StaffPerformanceEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadError(null);
      try {
        const shiftRes = await shifts.getCurrent();
        if (!active) return;
        setShift(shiftRes);

        if (isOpenShift(shiftRes)) {
          const perf = await shifts.getStaffPerformance().catch(() => ({ window_start: null, is_open: false, staff: [] as StaffPerformanceEntry[] }));
          if (!active) return;
          setMyPerf(perf.staff.find((s) => s.worker_tag === user?.workerTag) ?? null);
        } else {
          setMyPerf(null);
        }
      } catch (err) {
        if (!active) return;
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load shift status. Please check your connection.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.workerTag]);

  const open = isOpenShift(shift) ? shift : null;

  // Quick links are permission-driven — so a worker who's been granted extra
  // access (e.g. ledger:read via Team → Manage Permissions, see
  // app/(app)/settings/seats/page.tsx) sees it appear here automatically,
  // same as it appears in the Sidebar.
  const allQuickLinks: QuickLink[] = [
    {
      href: '/pos', label: 'Point of Sale', hint: 'Ring up a sale',
      icon: <Smartphone size={16} strokeWidth={2.5} />,
      iconWrapCls: 'bg-[#0052ff]/10 text-[#0052ff] group-hover:bg-[#0052ff]/20',
      permission: 'sales:create',
    },
    {
      href: '/shifts', label: 'Shifts', hint: open ? 'View live shift & staff activity' : 'Open the till to start selling',
      icon: <Clock size={16} strokeWidth={2.5} />,
      iconWrapCls: 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/50',
      permission: 'shifts:read',
    },
    {
      href: '/inventory', label: 'Inventory', hint: 'Look up stock & prices',
      icon: <Receipt size={16} />,
      iconWrapCls: 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/50',
      permission: 'inventory:read',
    },
    {
      href: '/ledgers', label: 'Customer Ledgers', hint: 'Granted by your Admin',
      icon: <Receipt size={16} />,
      iconWrapCls: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/60',
      permission: 'ledger:read',
    },
    {
      href: '/whatsapp', label: 'WhatsApp Digest', hint: 'Granted by your Admin',
      icon: <CheckCircle2 size={16} />,
      iconWrapCls: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/60',
      permission: 'whatsapp:send',
    },
  ];
  const quickLinks = allQuickLinks.filter((link) => !link.permission || hasPermission(link.permission));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-64px)] bg-zinc-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0052ff] border-t-transparent mx-auto" />
          <p className="text-zinc-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">

      {loadError && (
        <div className="text-[12.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5">
          {loadError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-[#0A0A0A] tracking-tight">Welcome back</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-500 mt-0.5">
            Worker tag: <strong className="text-zinc-700 font-mono">{user?.workerTag}</strong> · Role: <span className="text-[#0052ff] font-bold">{user?.role}</span>
          </p>
        </div>
        <button
          onClick={() => router.push('/pos')}
          className="bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.35)] flex items-center gap-2"
        >
          <Smartphone size={14} strokeWidth={2.5} />
          Open POS
        </button>
      </div>

      {/* Shift status */}
      {open ? (
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Shift Duration</p>
              <div className="text-[32px] sm:text-[38px] font-black leading-none tracking-tight">
                <ShiftTicker start={new Date(open.opened_at)} />
              </div>
              <p className="text-[13px] text-zinc-500 mt-2.5">
                Till opened by <span className="text-zinc-800 font-semibold">{open.worker_tag}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:gap-8 text-center lg:text-right border-t lg:border-t-0 lg:border-l border-zinc-200/60 pt-6 lg:pt-0 lg:pl-12">
              <div className="flex flex-col justify-center">
                <p className="text-xl sm:text-[24px] font-extrabold text-[#0052ff] font-mono tracking-tight">{myPerf?.sales_count ?? 0}</p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">My Sales This Shift</p>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xl sm:text-[24px] font-extrabold text-emerald-600 font-mono tracking-tight">XAF {(myPerf?.revenue ?? 0).toLocaleString()}</p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">My Revenue This Shift</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
            <Clock size={22} />
          </div>
          <h2 className="text-lg font-bold text-zinc-800">No shift is open yet</h2>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-sm mx-auto">
            {hasPermission('shifts:manage')
              ? 'Open the till from the Shifts page to start tracking sales before you ring anything up.'
              : 'Ask a manager to open the till before you start ringing up sales.'}
          </p>
          {hasPermission('shifts:manage') && (
            <button
              onClick={() => router.push('/shifts')}
              className="mt-6 px-4 py-2.5 rounded-xl bg-[#0052ff] text-white text-[13px] font-bold uppercase tracking-wider hover:bg-[#003bbf] transition-all shadow-md shadow-[#0052ff]/10"
            >
              Go to Shifts
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
            <Activity className="text-[#0052ff]" size={14} strokeWidth={2.5} />
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${link.iconWrapCls}`}>
                    {link.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-zinc-800">{link.label}</p>
                    <p className="text-[11px] text-zinc-400 font-medium">{link.hint}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}