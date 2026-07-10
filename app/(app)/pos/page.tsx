'use client';
import React, { useState } from 'react';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const CATALOG = [
  { sku: 'RICE-50KG', name: 'Rice 50kg',        price: 18000, stock: 2  },
  { sku: 'COIL-2L',   name: 'Cooking Oil 2L',   price: 2800,  stock: 0  },
  { sku: 'SUGA-25KG', name: 'Sugar 25kg',        price: 9200,  stock: 24 },
  { sku: 'TOMA-400G', name: 'Tomato Paste 400g', price: 650,   stock: 88 },
  { sku: 'SOAP-LUX',  name: 'Lux Soap ×12',     price: 4200,  stock: 15 },
  { sku: 'MILK-1L',   name: 'UHT Milk 1L',      price: 1200,  stock: 6  },
  { sku: 'MAIZ-25KG', name: 'Maize Flour 25kg',  price: 7600,  stock: 32 },
  { sku: 'FLOU-25KG', name: 'Flour 25kg',        price: 8800,  stock: 1  },
];

type CartItem = { sku: string; name: string; price: number; qty: number };

export default function PosPage() {
  const [q,       setQ]       = useState('');
  const [cart,    setCart]    = useState<CartItem[]>([]);
  const [method,  setMethod]  = useState<'CASH' | 'MOMO' | 'CREDIT' | 'CARD'>('CASH');
  const [charged, setCharged] = useState(false);

  const filtered = CATALOG.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.includes(q.toUpperCase()),
  );

  const addToCart = (p: typeof CATALOG[0]) => {
    if (p.stock === 0) return;
    setCart(prev => {
      const ex = prev.find(c => c.sku === p.sku);
      return ex
        ? prev.map(c => c.sku === p.sku ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { sku: p.sku, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const removeItem = (sku: string) => setCart(prev => prev.filter(c => c.sku !== sku));
  const updateQty  = (sku: string, qty: number) => {
    if (qty <= 0) { removeItem(sku); return; }
    setCart(prev => prev.map(c => c.sku === sku ? { ...c, qty } : c));
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;

  const handleCharge = () => {
    if (cart.length === 0) return;
    setCharged(true);
    setTimeout(() => { setCart([]); setCharged(false); }, 2200);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Left: product grid ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-zinc-800 bg-[#0C0C0E] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <Input dark icon={SEARCH_ICON} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search products by name or SKU…" className="text-[13px]" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filtered.map(p => {
            const inCart = cart.find(c => c.sku === p.sku);
            return (
              <button key={p.sku} onClick={() => addToCart(p)} disabled={p.stock === 0}
                className={`
                  relative text-left p-4 rounded-xl2 border transition-all duration-150
                  ${p.stock === 0
                    ? 'bg-zinc-900/40 border-zinc-800 opacity-50 cursor-not-allowed'
                    : inCart
                      ? 'bg-pulse/8 border-pulse/30 shadow-glow'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'}
                `}>
                {inCart && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pulse text-[#0C0C0E] text-[10px] font-bold flex items-center justify-center">
                    {inCart.qty}
                  </span>
                )}
                <p className="text-[13px] font-semibold text-zinc-200 leading-snug pr-4">{p.name}</p>
                <p className="text-[11px] font-mono text-zinc-500 mt-1">{p.sku}</p>
                <p className="text-[14px] font-bold text-pulse mt-2">
                  XAF {p.price.toLocaleString()}
                </p>
                <p className={`text-[11px] mt-0.5 ${p.stock === 0 ? 'text-red-400' : p.stock <= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: cart & checkout ───────────────────────────────── */}
      <div className="w-80 xl:w-96 flex flex-col bg-panel border-l border-zinc-800">

        {/* Cart header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Cart</h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-[12px] text-zinc-500 hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[13px] text-zinc-500">Tap a product to add it</p>
              </div>
            )
            : cart.map(c => (
              <div key={c.sku} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[12px] text-pulse font-semibold">XAF {(c.price * c.qty).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(c.sku, c.qty - 1)}
                    className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[13px] flex items-center justify-center">−</button>
                  <span className="w-6 text-center text-[13px] text-white font-semibold">{c.qty}</span>
                  <button onClick={() => updateQty(c.sku, c.qty + 1)}
                    className="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[13px] flex items-center justify-center">+</button>
                </div>
              </div>
            ))
          }
        </div>

        {/* Order summary */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800 space-y-3">
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>XAF {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tax (5%)</span>
                <span>XAF {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-[15px] pt-1.5 border-t border-zinc-800">
                <span>Total</span>
                <span className="text-pulse">XAF {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-4 gap-1.5">
              {(['CASH','MOMO','CREDIT','CARD'] as const).map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                    ${method === m
                      ? 'bg-pulse/15 border-pulse/40 text-pulse'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                  {m}
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={charged}
              onClick={handleCharge}
            >
              {charged ? 'Processing…' : `Charge XAF ${total.toLocaleString()}`}
            </Button>

            {charged && (
              <div className="flex items-center gap-2 text-[12px] text-emerald-400 justify-center">
                <span className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center">✓</span>
                Payment successful
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
