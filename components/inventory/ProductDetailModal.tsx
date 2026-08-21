// components/inventory/ProductDetailModal.tsx
'use client';
import React, { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { inventory } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { Product, ProductUnit, SupplierLog } from '@/lib/types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

function Fact({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold text-zinc-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export default function ProductDetailModal({ isOpen, onClose, product }: ProductDetailModalProps) {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [logs, setLogs] = useState<SupplierLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      inventory.units.list(product.id),
      inventory.getSupplierLogs(product.id),
    ])
      .then(([unitsRes, logsRes]) => {
        if (cancelled) return;
        setUnits(unitsRes.units);
        setLogs(logsRes.supplier_logs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load product history.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const status = product.stock_quantity <= 0 ? 'OUT' : product.stock_quantity <= product.reorder_level ? 'LOW' : 'OK';
  const statusColor = status === 'OUT' ? 'red' : status === 'LOW' ? 'amber' : 'green';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-zinc-900">{product.name}</h2>
              <Badge color={statusColor} dot>{status}</Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono">
              {product.product_sku}
              {product.barcode ? ` · ${product.barcode}` : ''}
              {product.category ? ` · ${product.category}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
          )}

          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50/80 rounded-xl border border-zinc-200/50 p-4">
            <Fact label="Stock" value={`${product.stock_quantity} ${product.base_unit}`} mono />
            <Fact label="Unit Price" value={`XAF ${product.unit_price.toLocaleString()}`} mono />
            <Fact
              label="Cost Price"
              value={product.cost_price !== null ? `XAF ${product.cost_price.toLocaleString()}` : '— not set'}
              mono
            />
            <Fact label="Tax Rate" value={`${product.tax_rate}%`} mono />
            <Fact label="Reorder Level" value={product.reorder_level} mono />
            <Fact
              label="Reorder Quantity"
              value={product.reorder_quantity !== null ? product.reorder_quantity : '— not set'}
              mono
            />
            <Fact label="Base Unit" value={product.base_unit} />
            <Fact label="Last Updated" value={new Date(product.updated_at).toLocaleDateString()} />
          </div>

          {error && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-zinc-400 gap-3">
              <span className="w-5 h-5 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
              <span className="font-semibold text-xs uppercase tracking-wider">Loading history…</span>
            </div>
          ) : (
            <>
              {/* Selling units */}
              {units.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Selling Units</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#0052ff]/10 text-[#0052ff]">
                      1 {product.base_unit} (base)
                    </span>
                    {units.map((u) => (
                      <span
                        key={u.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1.5"
                      >
                        1 {u.unit_name} = {u.conversion_factor} {product.base_unit}
                        {u.is_default && <span className="text-[#0052ff]">★</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery / supplier history */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Delivery History {logs.length > 0 && `(${logs.length})`}
                </h3>
                {logs.length === 0 ? (
                  <p className="text-sm text-zinc-400">No restocks recorded for this product yet.</p>
                ) : (
                  <div className="border border-zinc-200/70 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          <th className="text-left py-2.5 px-3">Date</th>
                          <th className="text-left py-2.5 px-3">Supplier</th>
                          <th className="text-right py-2.5 px-3">Qty</th>
                          <th className="text-right py-2.5 px-3">Unit Cost</th>
                          <th className="text-left py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {logs.map((log, idx) => {
                          const prev = logs[idx + 1]; // newest-first order, so "prev" is the one before this delivery chronologically
                          const supplierChanged = prev && prev.supplier_name !== log.supplier_name;
                          const costChanged =
                            prev && prev.unit_cost !== null && log.unit_cost !== null && prev.unit_cost !== log.unit_cost;
                          return (
                            <tr key={log.id}>
                              <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                                {new Date(log.received_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-zinc-800">{log.supplier_name}</span>
                                {log.supplier_contact && (
                                  <span className="text-zinc-400 text-xs ml-1.5">({log.supplier_contact})</span>
                                )}
                                {supplierChanged && (
                                  <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase">
                                    changed
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800">
                                +{log.quantity_received}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                                {log.unit_cost !== null ? log.unit_cost.toLocaleString() : '—'}
                                {costChanged && (
                                  <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase">
                                    changed
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-500">{log.notes ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
