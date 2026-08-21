// components/sales/SaleDetailModal.tsx
'use client';
import React, { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { sales } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/app/context/AuthContext';
import type { SaleDetailResponse, PaymentStatus } from '@/lib/types';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string | null;
  /** Called after a refund is successfully processed, so the list behind
   *  this modal can reload its row (updated payment_status/refunded_amount). */
  onRefunded?: () => void;
}

const STATUS_COLOR: Record<PaymentStatus, 'green' | 'amber' | 'red' | 'blue' | 'zinc'> = {
  PAID: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  REFUNDED: 'zinc',
  PARTIALLY_REFUNDED: 'amber',
};

/** Line-item quantities the cashier has entered for a new refund, keyed by
 *  `{sku}::{unit}` — the same key shape the backend uses internally. */
type DraftQuantities = Record<string, string>;

function lineKey(sku: string, unit: string | undefined): string {
  return `${sku}::${unit ?? ''}`;
}

export default function SaleDetailModal({ isOpen, onClose, saleId, onRefunded }: SaleDetailModalProps) {
  const { hasPermission } = useAuth();
  const [detail, setDetail] = useState<SaleDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draftQuantities, setDraftQuantities] = useState<DraftQuantities>({});
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = React.useCallback(async () => {
    if (!saleId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await sales.getById(saleId);
      setDetail(res);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load sale details.');
    } finally {
      setIsLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    if (isOpen && saleId) {
      setDraftQuantities({});
      setReason('');
      setRestock(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      void load();
    } else if (!isOpen) {
      setDetail(null);
    }
  }, [isOpen, saleId, load]);

  if (!isOpen) return null;

  const sale = detail?.sale ?? null;
  const canRefund =
    !!sale &&
    hasPermission('sales:refund') &&
    !sale.voided_at &&
    (sale.payment_status === 'PAID' || sale.payment_status === 'PARTIALLY_REFUNDED');

  const refundableLines = (detail?.refundable_lines ?? []).filter((l) => l.quantityRemaining > 0);

  const requestedItems = refundableLines
    .map((line) => {
      const raw = draftQuantities[lineKey(line.product_sku, line.unit)];
      const qty = raw ? Number(raw) : 0;
      return { line, qty };
    })
    .filter((r) => r.qty > 0);

  const refundPreviewAmount = requestedItems.reduce((sum, r) => sum + r.line.unit_price * r.qty, 0);

  const handleSubmitRefund = async () => {
    if (!sale || requestedItems.length === 0 || !reason.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await sales.refund(sale.id, {
        items: requestedItems.map((r) => ({
          product_sku: r.line.product_sku,
          quantity: r.qty,
          unit: r.line.unit,
        })),
        reason: reason.trim(),
        restock,
      });
      setSubmitSuccess(true);
      setDraftQuantities({});
      setReason('');
      await load();
      onRefunded?.();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to process refund.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 font-mono">
              {sale?.transaction_id ?? 'Sale detail'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {sale ? new Date(sale.sale_timestamp).toLocaleString() : 'Loading…'}
              {sale?.customer_name ? ` · ${sale.customer_name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-zinc-400 gap-3">
              <span className="w-5 h-5 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
              <span className="font-semibold text-xs uppercase tracking-wider">Loading sale…</span>
            </div>
          )}

          {loadError && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-4 py-3">
              {loadError}
            </div>
          )}

          {sale && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Badge color={STATUS_COLOR[sale.payment_status]} dot>{sale.payment_status.replace('_', ' ')}</Badge>
                  <Badge color="zinc">{sale.payment_method}</Badge>
                  {sale.voided_at && <Badge color="red">VOIDED</Badge>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-zinc-900 font-mono">
                    XAF {sale.total_amount.toLocaleString()}
                  </p>
                  {sale.refunded_amount > 0 && (
                    <p className="text-xs font-bold text-amber-600 mt-0.5">
                      XAF {sale.refunded_amount.toLocaleString()} refunded so far
                    </p>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Items</h3>
                <div className="border border-zinc-200/70 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        <th className="text-left py-2.5 px-3">Product</th>
                        <th className="text-right py-2.5 px-3">Qty</th>
                        <th className="text-right py-2.5 px-3">Price</th>
                        <th className="text-right py-2.5 px-3">Total</th>
                        {canRefund && <th className="text-right py-2.5 px-3">Refund qty</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sale.items_sold.map((item, idx) => {
                        const refundable = detail?.refundable_lines.find(
                          (l) => l.product_sku === item.product_sku && (l.unit ?? '') === (item.unit ?? ''),
                        );
                        const key = lineKey(item.product_sku, item.unit);
                        const remaining = refundable?.quantityRemaining ?? 0;
                        return (
                          <tr key={`${item.product_sku}-${idx}`}>
                            <td className="py-2.5 px-3 font-semibold text-zinc-800">
                              {item.product_sku}
                              {remaining > 0 && remaining < item.quantity && (
                                <span className="ml-2 text-[10px] font-bold text-amber-600">
                                  {remaining} left to refund
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-600">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                              {item.unit_price.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800">
                              {item.total.toLocaleString()}
                            </td>
                            {canRefund && (
                              <td className="py-2.5 px-3 text-right">
                                {remaining > 0 ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={remaining}
                                    step="any"
                                    value={draftQuantities[key] ?? ''}
                                    onChange={(e) =>
                                      setDraftQuantities((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    placeholder="0"
                                    className="w-20 text-right text-sm font-mono border border-zinc-200 rounded-md px-2 py-1 outline-none focus:border-[#0052ff]"
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-400 font-semibold">fully refunded</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund history */}
              {detail && detail.refunds.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Refund history</h3>
                  <div className="space-y-2">
                    {detail.refunds.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2.5 border border-zinc-200/50">
                        <div>
                          <p className="text-sm font-bold text-zinc-800">
                            XAF {r.refund_amount.toLocaleString()}
                            {!r.restocked && (
                              <span className="ml-2 text-[10px] font-bold text-red-500 uppercase">not restocked</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">{r.reason}</p>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono whitespace-nowrap ml-4">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refund form */}
              {canRefund && (
                <div className="border-t border-zinc-200/60 pt-5 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Process a refund</h3>

                  <label className="block">
                    <span className="text-sm font-bold text-zinc-700">Reason</span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Customer returned damaged goods"
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(e) => setRestock(e.target.checked)}
                      className="rounded border-zinc-300"
                    />
                    Return items to stock
                    <span className="text-xs text-zinc-400 font-normal">(uncheck for damaged/unsellable goods)</span>
                  </label>

                  {refundableLines.length === 0 && (
                    <p className="text-sm text-zinc-400">Every line item on this sale has already been refunded.</p>
                  )}

                  {submitError && (
                    <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                      Refund processed successfully.
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm font-bold text-zinc-600">
                      Refund total: <span className="text-[#0052ff] font-mono">XAF {refundPreviewAmount.toLocaleString()}</span>
                    </p>
                    <Button
                      variant="primary"
                      className="bg-[#0052ff] hover:bg-[#003bbf] text-white"
                      loading={isSubmitting}
                      disabled={requestedItems.length === 0 || !reason.trim()}
                      onClick={handleSubmitRefund}
                    >
                      Refund XAF {refundPreviewAmount.toLocaleString()}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
