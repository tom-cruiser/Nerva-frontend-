'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { inventory } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';
import RequireRole from '@/components/RequireRole';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400">
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
const STATUS_COLOR = { OK: 'emerald' as const, LOW: 'amber' as const, OUT: 'red' as const };

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
    <RequireRole requiredPermission="inventory:read">
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-screen text-[#0A0A0A]">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Inventory</h1>
            <p className="text-[14px] text-zinc-500 mt-0.5">
              {stats.total} products · <span className="text-amber-600 font-semibold">{stats.low + stats.out} need attention</span>
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" className="border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 hover:text-zinc-800 text-[13px] font-bold">
              Export CSV
            </Button>
            <Button size="sm" className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-md shadow-[#0052ff]/10">
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
            The inventory API (<code className="font-mono text-amber-800 font-extrabold bg-amber-100/55 px-1 rounded">GET /api/v1/inventory/products</code>) is
            not implemented on the backend yet — showing sample data.
          </Banner>
        )}
        {state.kind === 'error' && (
          <Banner tone="error">Failed to load inventory: {state.message}</Banner>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: String(stats.total), sub: 'active SKUs', color: 'text-zinc-850' },
            { label: 'Low Stock', value: String(stats.low), sub: 'below reorder', color: 'text-amber-600' },
            { label: 'Out of Stock', value: String(stats.out), sub: 'needs restock', color: 'text-red-600' },
            { label: 'Inventory Value', value: `XAF ${stats.value.toLocaleString()}`, sub: 'at unit price', color: 'text-[#0052ff] font-mono' },
          ].map((s) => (
            <div key={s.label} className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-[24px] font-black mt-1.5 tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-medium text-zinc-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Table Container */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
          <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200/40 bg-white/40">
            <div className="w-80">
              <Input 
                icon={SEARCH_ICON} 
                value={q} 
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products by name or SKU…" 
                className="h-9.5 text-[13px] bg-zinc-50/80 border-zinc-200/70 focus:border-[#0052ff]/60 focus:bg-white text-zinc-800 placeholder-zinc-400" 
              />
            </div>
          </div>

          {state.kind === 'loading' ? (
            <div className="flex items-center justify-center py-20 text-zinc-400 gap-3">
              <span className="w-5 h-5 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
              <span className="font-semibold text-xs uppercase tracking-wider">Loading inventory…</span>
            </div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {['SKU', 'Product', 'Category', 'Unit Price (XAF)', 'Stock', 'Reorder Level', 'Status', ''].map((h) => (
                      <th key={h} className="py-4 px-4 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                  {filtered.map((p) => {
                    const status = statusOf(p);
                    return (
                      <tr key={p.id} className="hover:bg-[#0052ff]/[0.02] transition-colors group cursor-default">
                        <td className="py-3.5 px-4 font-mono text-zinc-400 font-bold text-[11px] uppercase tracking-wider">{p.product_sku}</td>
                        <td className="py-3.5 px-4 text-zinc-850 font-bold">{p.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] bg-zinc-100 text-zinc-500 font-semibold px-2.5 py-0.5 rounded-full">{p.category ?? '—'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-650 font-bold font-mono">{p.unit_price.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`font-mono font-black text-[13px] ${
                            status === 'OUT' ? 'text-red-500' : status === 'LOW' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 font-bold font-mono">{p.reorder_level}</td>
                        <td className="py-3.5 px-4">
                          <Badge color={STATUS_COLOR[status]} dot>{status}</Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200/30 hover:bg-zinc-200 transition-colors">
                              Edit
                            </button>
                            <button className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#0052ff]/10 text-[#0052ff] hover:bg-[#0052ff]/20 transition-colors">
                              Restock
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-zinc-450 font-bold text-[13px]">
                        No products match “{q}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}

function Banner({ tone, children }: { tone: 'warn' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'warn'
      ? 'bg-amber-50 border-amber-200/80 text-amber-800'
      : 'bg-red-50 border-red-200/80 text-red-800';
  return (
    <div className={`text-[13px] rounded-xl border px-4 py-3.5 font-semibold shadow-sm ${cls}`}>{children}</div>
  );
}