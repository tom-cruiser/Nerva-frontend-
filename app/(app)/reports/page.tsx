// app/(app)/reports/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import RequireRole from '@/components/RequireRole';
import { analytics } from '@/lib/endpoints';
import type { SalesReport } from '@/lib/endpoints';
import { whatsapp, ApiError } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Percent,
  Package,
  Users,
  AlertTriangle,
  Download,
  FileText,
  Calendar,
} from 'lucide-react';

type RangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const REGISTER_BADGE: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/30' },
  CLOSED: { label: 'Closed', className: 'bg-zinc-100/80 text-zinc-500 border-zinc-200/30' },
  ANOMALY: { label: 'Anomaly', className: 'bg-red-50/80 text-red-700 border-red-200/30' },
  FORCE_CLOSED: { label: 'Force Closed', className: 'bg-amber-50/80 text-amber-700 border-amber-200/30' },
};

/** Minimal RFC 4180-ish CSV cell escape — no client-side CSV library exists
 *  in this app, and the report is small enough not to need one. */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(report: SalesReport): string {
  const lines: string[] = [];
  lines.push('Metric,Value');
  lines.push(`Gross Revenue,${report.totalSales}`);
  lines.push(`Net Profit,${report.netProfit ?? 'N/A'}`);
  lines.push(`Average Order Value,${report.averageOrderValue}`);
  lines.push(`Total Discount Amount,${report.totalDiscountAmount}`);
  lines.push(`Total Orders,${report.totalOrders}`);
  lines.push(`Low Stock Count,${report.lowStockCount}`);
  lines.push('');
  lines.push('Payment Method,Amount,Count');
  report.paymentMethods.forEach((m) => lines.push(`${csvCell(m.method)},${m.amount},${m.count}`));
  lines.push('');
  lines.push('Top Product,SKU,Quantity,Revenue');
  report.topSellingProducts.forEach((p) => lines.push(`${csvCell(p.name)},${csvCell(p.sku)},${p.quantity},${p.revenue}`));
  lines.push('');
  lines.push('Category,Revenue');
  report.revenueByCategory.forEach((c) => lines.push(`${csvCell(c.category)},${c.revenue}`));
  lines.push('');
  lines.push('Cashier,Sales Count,Revenue,Register Status');
  report.cashierPerformance.forEach((c) =>
    lines.push(`${csvCell(c.fullName)},${c.salesCount},${c.revenue},${csvCell(c.registerStatus ?? 'Never opened')}`),
  );
  return lines.join('\n');
}

export default function ReportsPage() {
  const [range, setRange] = useState<RangeKey>('today');
  const [customStart, setCustomStart] = useState(toISODate(new Date()));
  const [customEnd, setCustomEnd] = useState(toISODate(new Date()));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const query = useMemo(() => {
    const today = new Date();
    switch (range) {
      case 'today':
        return { date: toISODate(today), period: 'daily' as const };
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { date: toISODate(y), period: 'daily' as const };
      }
      case 'week':
        return { date: toISODate(today), period: 'weekly' as const };
      case 'month':
        return { date: toISODate(today), period: 'monthly' as const };
      case 'custom':
        return { start: customStart, end: customEnd };
    }
  }, [range, customStart, customEnd]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    const req = 'date' in query
      ? analytics.getSalesReport(query.date, query.period)
      : analytics.getSalesReport({ start: query.start, end: query.end }, 'custom');

    req.then((res) => {
      if (!active) return;
      setReport(res);
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof ApiError ? err.message : 'Failed to load report');
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [query]);

  const handleExportCsv = () => {
    if (!report) return;
    setExportError(null);
    const blob = new Blob([buildCsv(report)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nerva-report-${report.date ?? `${report.start}_${report.end}`}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!report) return;
    setIsExporting('pdf');
    setExportError(null);
    try {
      const blob = await whatsapp.getReportPdf(report.date ?? report.start ?? '', report.period, report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nerva-report-${report.date ?? `${report.start}_${report.end}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Failed to generate PDF');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <RequireRole requiredPermission="reports:read">
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-[14px] text-zinc-500 mt-0.5">Business performance for the selected period</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={!report}
              className="flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-all disabled:opacity-50"
            >
              <Download size={14} strokeWidth={2.5} /> Export CSV
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!report || isExporting === 'pdf'}
              className="flex items-center gap-1.5 bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] disabled:opacity-50"
            >
              <FileText size={14} strokeWidth={2.5} /> {isExporting === 'pdf' ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
        </div>

        {exportError && (
          <div className="text-[12.5px] font-semibold text-red-700 bg-red-50 border border-red-200/80 rounded-xl px-4 py-2.5">
            {exportError}
          </div>
        )}

        {/* Date range filter */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-4 flex items-center flex-wrap gap-2">
          <Calendar size={16} className="text-zinc-400 mr-1" />
          {([
            ['today', 'Today'],
            ['yesterday', 'Yesterday'],
            ['week', 'This Week'],
            ['month', 'This Month'],
            ['custom', 'Custom Range'],
          ] as Array<[RangeKey, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                range === key
                  ? 'bg-[#0052ff] text-white shadow-[0_4px_12px_rgba(0,82,255,0.25)]'
                  : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/60'
              }`}
            >
              {label}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs"
              />
              <span className="text-zinc-400 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="text-[12.5px] font-semibold text-red-700 bg-red-50 border border-red-200/80 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        {isLoading && !report ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : report && (
          <>
            {/* Financial metric tiles */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Gross Revenue</p>
                  <DollarSign size={14} className="text-[#0052ff]" />
                </div>
                <p className="text-2xl font-extrabold text-[#0052ff] tracking-tight font-mono">
                  XAF {report.totalSales.toLocaleString()}
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Net Profit</p>
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                {report.netProfit === null ? (
                  <>
                    <p className="text-2xl font-extrabold text-zinc-300 tracking-tight font-mono">—</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      Set a cost price on all products to see this ({report.productsWithoutCost} missing)
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-extrabold text-emerald-600 tracking-tight font-mono">
                    XAF {report.netProfit.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Avg Order Value</p>
                  <Receipt size={14} className="text-zinc-500" />
                </div>
                <p className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight font-mono">
                  XAF {Math.round(report.averageOrderValue).toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-400 font-semibold mt-1">{report.totalOrders} orders</p>
              </div>

              <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Total Discounts</p>
                  <Percent size={14} className="text-amber-600" />
                </div>
                <p className="text-2xl font-extrabold text-amber-600 tracking-tight font-mono">
                  XAF {report.totalDiscountAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Payment methods + top products + categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                  <DollarSign className="text-[#0052ff]" size={14} strokeWidth={2.5} /> Payment Methods
                </h3>
                <div className="space-y-2.5">
                  {report.paymentMethods.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-6">No payments in this period.</p>
                  )}
                  {report.paymentMethods.map((m) => (
                    <div key={m.method} className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-zinc-700">{m.method}</span>
                      <span className="font-mono font-bold text-zinc-900">
                        XAF {m.amount.toLocaleString()} <span className="text-zinc-400 font-normal">({m.count})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                  <Package className="text-[#0052ff]" size={14} strokeWidth={2.5} /> Top Products
                </h3>
                <div className="space-y-2.5">
                  {report.topSellingProducts.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-6">No sales in this period.</p>
                  )}
                  {report.topSellingProducts.map((p) => (
                    <div key={p.sku} className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-zinc-700 truncate mr-2">{p.name}</span>
                      <span className="font-mono font-bold text-zinc-900 shrink-0">XAF {p.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-2">
                    <AlertTriangle className="text-amber-600" size={14} strokeWidth={2.5} /> Low Stock
                  </h3>
                </div>
                <p className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono">{report.lowStockCount}</p>
                <p className="text-[11px] text-zinc-400 font-semibold mt-1">Products at or below reorder level</p>
                <div className="mt-4 pt-4 border-t border-zinc-200/40">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">By Category</p>
                  <div className="space-y-1.5">
                    {report.revenueByCategory.slice(0, 4).map((c) => (
                      <div key={c.category} className="flex items-center justify-between text-[12px]">
                        <span className="text-zinc-600">{c.category}</span>
                        <span className="font-mono font-semibold text-zinc-800">XAF {c.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cashier performance */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                  <Users className="text-[#0052ff]" size={16} strokeWidth={2.5} />
                  Cashier Performance
                </h2>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                      <th className="py-4 px-4">Cashier</th>
                      <th className="py-4 px-4">Sales</th>
                      <th className="py-4 px-4">Revenue</th>
                      <th className="py-4 px-4 text-right">Register</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                    {report.cashierPerformance.map((c) => {
                      const badge = c.registerStatus ? REGISTER_BADGE[c.registerStatus] : null;
                      return (
                        <tr key={c.workerTag} className="hover:bg-[#0052ff]/[0.02] transition-all">
                          <td className="py-4 px-4 font-bold text-zinc-900">{c.fullName}</td>
                          <td className="py-4 px-4 font-mono text-zinc-500 font-semibold">{c.salesCount}</td>
                          <td className="py-4 px-4 font-bold font-mono text-[#0052ff] text-[13px]">
                            XAF {c.revenue.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge?.className ?? 'bg-zinc-100/80 text-zinc-400 border-zinc-200/30'}`}>
                              {badge?.label ?? 'Never opened'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {report.cashierPerformance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-zinc-400 font-semibold text-xs">
                          No sales recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RequireRole>
  );
}
