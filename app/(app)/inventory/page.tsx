'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { inventory } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

/** Sample rows shown when the backend inventory endpoint is still a stub. */
const SAMPLE: Product[] = [
  mk('RICE-50KG', 'Rice 50kg', 'Cereals', 18000, 2, 5),
  mk('COIL-2L', 'Cooking Oil 2L', 'Oils', 2800, 0, 10),
  mk('SUGA-25KG', 'Sugar 25kg', 'Dry Goods', 9200, 24, 5),
  mk('FLOU-25KG', 'Flour 25kg', 'Dry Goods', 8800, 1, 8),
  mk('TOMA-400G', 'Tomato Paste 400g', 'Canned', 650, 88, 20),
  mk('SOAP-LUX', 'Lux Soap ×12', 'Hygiene', 4200, 15, 12),
  mk('MILK-1L', 'UHT Milk 1L', 'Dairy', 1200, 6, 12),
  mk('MAIZ-25KG', 'Maize Flour 25kg', 'Cereals', 7600, 32, 5),
];

function mk(
  sku: string, name: string, category: string,
  price: number, stock: number, reorder: number,
): Product {
  return {
    id: sku, product_sku: sku, barcode: null, name, description: null,
    unit_price: price, stock_quantity: stock, reorder_level: reorder,
    category, updated_at: new Date(0).toISOString(), deleted_at: null,
  };
}

type Status = 'OK' | 'LOW' | 'OUT';
const STATUS_COLOR = { OK: 'green' as const, LOW: 'amber' as const, OUT: 'red' as const };

function statusOf(p: Product): Status {
  if (p.stock_quantity <= 0) return 'OUT';
  if (p.stock_quantity <= p.reorder_level) return 'LOW';
  return 'OK';
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'live'; products: Product[] }
  | { kind: 'stub' } // 501 — endpoint not implemented, use SAMPLE
  | { kind: 'error'; message: string };

export default function InventoryPage() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    inventory
      .listProducts()
      .then((res) => active && setState({ kind: 'live', products: res.products ?? [] }))
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.isNotImplemented) setState({ kind: 'stub' });
        else if (err instanceof ApiError) setState({ kind: 'error', message: err.message });
        else setState({ kind: 'error', message: 'Could not reach the gateway on :8080.' });
      });
    return () => {
      active = false;
    };
  }, []);

  const products = state.kind === 'live' ? state.products : SAMPLE;

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.product_sku.toLowerCase().includes(q.toLowerCase()),
      ),
    [products, q],
  );

  const stats = useMemo(() => {
    const low = products.filter((p) => statusOf(p) === 'LOW').length;
    const out = products.filter((p) => statusOf(p) === 'OUT').length;
    const value = products.reduce((s, p) => s + p.unit_price * p.stock_quantity, 0);
    return { total: products.length, low, out, value };
  }, [products]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-ink tracking-tight">Inventory</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">
            {stats.total} products · {stats.low + stats.out} need attention
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export CSV</Button>
          <Button size="sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="mr-1.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Product
          </Button>
        </div>
      </div>

      {/* Backend status banner */}
      {state.kind === 'stub' && (
        <Banner tone="warn">
          The inventory API (<code className="font-mono">GET /api/v1/inventory/products</code>) is
          not implemented on the backend yet — showing sample data.
        </Banner>
      )}
      {state.kind === 'error' && (
        <Banner tone="error">Failed to load inventory: {state.message}</Banner>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: String(stats.total), sub: 'active SKUs' },
          { label: 'Low Stock', value: String(stats.low), sub: 'below reorder' },
          { label: 'Out of Stock', value: String(stats.out), sub: 'needs restock' },
          { label: 'Inventory Value', value: `XAF ${stats.value.toLocaleString()}`, sub: 'at unit price' },
        ].map((s) => (
          <div key={s.label} className="bg-panel border border-zinc-800 rounded-xl2 p-4">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-[22px] font-bold text-white mt-1">{s.value}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card dark padding="sm">
        <div className="flex items-center gap-4 px-1 py-2 mb-3">
          <div className="w-72">
            <Input dark icon={SEARCH_ICON} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…" className="h-8 text-[13px]" />
          </div>
        </div>

        {state.kind === 'loading' ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 gap-3">
            <span className="w-5 h-5 border-2 border-pulse border-t-transparent rounded-full animate-spin" />
            Loading inventory…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  {['SKU', 'Product', 'Category', 'Unit Price (XAF)', 'Stock', 'Reorder Level', 'Status', ''].map((h) => (
                    <th key={h} className="text-left font-medium pb-2.5 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((p) => {
                  const status = statusOf(p);
                  return (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                      <td className="py-3 pr-4 font-mono text-zinc-500 text-[11px]">{p.product_sku}</td>
                      <td className="py-3 pr-4 text-zinc-200 font-medium">{p.name}</td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{p.category ?? '—'}</span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-300 font-mono">{p.unit_price.toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-bold ${status === 'OUT' ? 'text-red-400' : status === 'LOW' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">{p.reorder_level}</td>
                      <td className="py-3 pr-4">
                        <Badge color={STATUS_COLOR[status]} dot>{status}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-2.5 py-1 rounded-md text-[11px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Edit</button>
                          <button className="px-2.5 py-1 rounded-md text-[11px] bg-pulse/10 text-pulse hover:bg-pulse/20">Restock</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-600 text-[13px]">
                      No products match “{q}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'warn' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'warn'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      : 'bg-red-500/10 border-red-500/30 text-red-300';
  return (
    <div className={`text-[13px] rounded-lg border px-4 py-2.5 ${cls}`}>{children}</div>
  );
}
