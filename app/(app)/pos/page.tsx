'use client';
import React, { useState } from 'react';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input  from '@/components/ui/Input';
import RequireRole from '@/components/RequireRole';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400">
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
    <RequireRole requiredPermission="sales:create">
      <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-zinc-50/50">

        {/* ── Left: product grid ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col border-r border-zinc-250/60 bg-white overflow-hidden">
          <div className="p-4 border-b border-zinc-200/50 bg-white/60 backdrop-blur-md">
            <Input 
              icon={SEARCH_ICON} 
              value={q} 
              onChange={e => setQ(e.target.value)}
              placeholder="Search products by name or SKU…" 
              className="text-[13px] bg-zinc-50/80 border-zinc-200/70 focus:border-[#0052ff]/60 focus:bg-white text-zinc-800" 
            />
          </div>

          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 content-start bg-zinc-50/40">
            {filtered.map(p => {
              const inCart = cart.find(c => c.sku === p.sku);
              return (
                <button 
                  key={p.sku} 
                  onClick={() => addToCart(p)} 
                  disabled={p.stock === 0}
                  className={`
                    relative text-left p-4.5 rounded-2xl border transition-all duration-150
                    ${p.stock === 0
                      ? 'bg-zinc-100/50 border-zinc-200 opacity-55 cursor-not-allowed'
                      : inCart
                        ? 'bg-[#0052ff]/[0.04] border-[#0052ff] shadow-[0_4px_16px_rgba(0,82,255,0.08)]'
                        : 'bg-white border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm hover:bg-zinc-50/30'}
                  `}
                >
                  {inCart && (
                    <span className="absolute top-3 right-3 w-5.5 h-5.5 rounded-full bg-[#0052ff] text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                      {inCart.qty}
                    </span>
                  )}
                  <p className="text-[13px] font-extrabold text-zinc-850 leading-snug pr-6">{p.name}</p>
                  <p className="text-[10px] font-bold font-mono text-zinc-400 mt-1 uppercase tracking-wider">{p.sku}</p>
                  <p className="text-[15px] font-black text-[#0052ff] mt-2.5">
                    XAF {p.price.toLocaleString()}
                  </p>
                  <p className={`text-[10.5px] font-bold mt-1 ${
                    p.stock === 0 
                      ? 'text-red-500' 
                      : p.stock <= 3 
                        ? 'text-amber-600' 
                        : 'text-zinc-400'
                  }`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: cart & checkout ───────────────────────────────── */}
        <div className="w-80 xl:w-[380px] flex flex-col bg-white border-l border-zinc-200/60 shadow-lg">

          {/* Cart header */}
          <div className="px-5 py-4.5 border-b border-zinc-200/50 flex items-center justify-between bg-white/50">
            <h2 className="text-[15px] font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
              <svg className="text-[#0052ff] w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Cart
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])} 
                className="text-[11px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-wider transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-zinc-50/30">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-zinc-650">Your cart is empty</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Tap products on the left to add them to your sale.</p>
                </div>
              </div>
            ) : (
              cart.map(c => (
                <div key={c.sku} className="flex items-center gap-3.5 p-3.5 bg-white rounded-xl border border-zinc-200/50 shadow-sm transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-zinc-800 truncate">{c.name}</p>
                    <p className="text-[12px] text-[#0052ff] font-bold font-mono mt-0.5">XAF {(c.price * c.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-100/70 p-1 rounded-lg border border-zinc-200/20">
                    <button 
                      onClick={() => updateQty(c.sku, c.qty - 1)}
                      className="w-5.5 h-5.5 rounded-md bg-white text-zinc-600 hover:text-[#0052ff] border border-zinc-200/30 shadow-sm text-[12px] font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-[12px] text-zinc-800 font-extrabold">{c.qty}</span>
                    <button 
                      onClick={() => updateQty(c.sku, c.qty + 1)}
                      className="w-5.5 h-5.5 rounded-md bg-white text-zinc-600 hover:text-[#0052ff] border border-zinc-200/30 shadow-sm text-[12px] font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Order summary */}
          {cart.length > 0 && (
            <div className="px-5 py-5 border-t border-zinc-200/60 space-y-4 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.03)]">
              <div className="space-y-2 text-[12.5px]">
                <div className="flex justify-between text-zinc-500 font-semibold">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-700">XAF {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-semibold">
                  <span>Tax (5%)</span>
                  <span className="font-mono text-zinc-700">XAF {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-900 font-black text-[15px] pt-2.5 border-t border-zinc-200/50">
                  <span>Total</span>
                  <span className="text-[#0052ff] font-mono text-[16px]">XAF {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment method pills */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['CASH','MOMO','CREDIT','CARD'] as const).map(m => (
                  <button 
                    key={m} 
                    onClick={() => setMethod(m)}
                    className={`py-2 rounded-lg text-[10.5px] font-extrabold border transition-all
                      ${method === m
                        ? 'bg-[#0052ff] border-[#0052ff] text-white shadow-sm'
                        : 'bg-zinc-50 border-zinc-200/70 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100/50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <Button
                className="w-full py-3 text-[13px] font-bold uppercase tracking-wider rounded-xl bg-[#0052ff] hover:bg-[#003bbf] text-white shadow-md shadow-[#0052ff]/10"
                size="lg"
                loading={charged}
                onClick={handleCharge}
              >
                {charged ? 'Processing…' : `Charge XAF ${total.toLocaleString()}`}
              </Button>

              {charged && (
                <div className="flex items-center gap-2 text-[12px] text-emerald-600 font-bold justify-center bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>
                  Payment successful
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}