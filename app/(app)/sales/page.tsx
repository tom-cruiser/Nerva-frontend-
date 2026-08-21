// app/(app)/sales/page.tsx
'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import RequireRole from '@/components/RequireRole';
import { sales } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { SaleListItem, PaymentStatus } from '@/lib/types';
import SaleDetailModal from '@/components/sales/SaleDetailModal';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const STATUS_COLOR: Record<PaymentStatus, 'green' | 'amber' | 'red' | 'blue' | 'zinc'> = {
  PAID: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  REFUNDED: 'zinc',
  PARTIALLY_REFUNDED: 'amber',
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially refunded' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const PAGE_SIZE = 25;

export default function SalesHistoryPage() {
  const [rows, setRows] = useState<SaleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sales.list({
        q: q || undefined,
        paymentStatus: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(res.sales);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sales history.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <RequireRole requiredPermission="sales:read">
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-screen text-[#0A0A0A]">
        {/* Header */}
        <div>
          <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Sales History</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">
            {total} sale{total === 1 ? '' : 's'} · view receipts and process refunds
          </p>
        </div>

        {error && (
          <div className="text-[13px] rounded-xl border px-4 py-3.5 font-semibold shadow-sm bg-red-50 border-red-200/80 text-red-800">
            Failed to load sales: {error}
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200/40 bg-white/40 flex-wrap">
            <div className="w-80">
              <Input
                icon={SEARCH_ICON}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by transaction ID or customer…"
                className="h-9.5 text-[13px] bg-zinc-50/80 border-zinc-200/70 focus:border-[#0052ff]/60 focus:bg-white text-zinc-800 placeholder-zinc-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 text-[13px] bg-zinc-50/80 border border-zinc-200/70 rounded-lg px-3 text-zinc-700 font-medium outline-none focus:border-[#0052ff]/60"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-zinc-400 gap-3">
              <span className="w-5 h-5 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
              <span className="font-semibold text-xs uppercase tracking-wider">Loading sales…</span>
            </div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {['Date', 'Transaction', 'Customer', 'Items', 'Total (XAF)', 'Method', 'Status', ''].map((h) => (
                      <th key={h} className="py-4 px-4 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                  {rows.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-[#0052ff]/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedSaleId(sale.id)}
                    >
                      <td className="py-3.5 px-4 text-zinc-500 font-mono whitespace-nowrap">
                        {new Date(sale.sale_timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-800 font-bold">{sale.transaction_id}</td>
                      <td className="py-3.5 px-4 text-zinc-650">{sale.customer_name ?? '—'}</td>
                      <td className="py-3.5 px-4 text-zinc-500 font-mono">{sale.items_sold.length}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-850">
                        {sale.total_amount.toLocaleString()}
                        {sale.refunded_amount > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-600">
                            −{sale.refunded_amount.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] bg-zinc-100 text-zinc-500 font-semibold px-2.5 py-0.5 rounded-full">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge color={STATUS_COLOR[sale.payment_status]} dot>
                          {sale.payment_status.replace('_', ' ')}
                        </Badge>
                        {sale.voided_at && <Badge color="red" className="ml-1.5">VOIDED</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#0052ff] font-bold">View →</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-zinc-450 font-bold text-[13px]">
                        No sales match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200/40 bg-white/40 text-xs font-semibold text-zinc-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SaleDetailModal
        isOpen={selectedSaleId !== null}
        onClose={() => setSelectedSaleId(null)}
        saleId={selectedSaleId}
        onRefunded={load}
      />
    </RequireRole>
  );
}
