"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Wifi,
  WifiOff,
  ScanBarcode,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Smartphone,
  Tablet,
  Monitor,
  PackageSearch,
  MessageCircle,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  RotateCw,
  UserCircle2,
  Users,
  Crown,
  Lock,
  ArrowRight,
  Rocket,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
 * Data grounded in the actual product (see components/pos, lib/types.ts,
 * lib/pending-sales-queue.ts, components/whatsapp, app/(app)/shifts,
 * app/(app)/inventory). No invented customer names or fabricated metrics —
 * every number on this page is either a live client-side simulation of the
 * real checkout/sync flow, or a plainly-labelled estimate.
 * ──────────────────────────────────────────────────────────────────────── */

type Category = 'Beverages' | 'Snacks' | 'Household' | 'Produce';

interface DemoProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  taxRate: number;
  stock: number;
  reorderLevel: number;
  category: Category;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'p1', name: 'Sparkling Water 500ml', sku: 'BEV-0231', price: 1.2, taxRate: 0.08, stock: 42, reorderLevel: 15, category: 'Beverages' },
  { id: 'p2', name: 'Roasted Almonds 200g', sku: 'SNK-1042', price: 3.8, taxRate: 0.08, stock: 9, reorderLevel: 10, category: 'Snacks' },
  { id: 'p3', name: 'Dish Soap 750ml', sku: 'HH-0087', price: 2.5, taxRate: 0.0, stock: 0, reorderLevel: 8, category: 'Household' },
  { id: 'p4', name: 'Bananas (bunch)', sku: 'PRD-0019', price: 1.6, taxRate: 0.0, stock: 27, reorderLevel: 12, category: 'Produce' },
  { id: 'p5', name: 'Cold Brew Coffee', sku: 'BEV-0399', price: 2.9, taxRate: 0.08, stock: 18, reorderLevel: 10, category: 'Beverages' },
  { id: 'p6', name: 'Paper Towels 2pk', sku: 'HH-0154', price: 4.1, taxRate: 0.08, stock: 5, reorderLevel: 10, category: 'Household' },
];

const CATEGORIES: Category[] = ['Beverages', 'Snacks', 'Household', 'Produce'];

type PaymentMethod = 'CASH' | 'MOMO' | 'CARD' | 'CREDIT';
const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'MOMO', label: 'Mobile Money' },
  { key: 'CARD', label: 'Card' },
  { key: 'CREDIT', label: 'Credit' },
];

function stockStatus(p: DemoProduct): 'OK' | 'LOW' | 'OUT' {
  if (p.stock <= 0) return 'OUT';
  if (p.stock <= p.reorderLevel) return 'LOW';
  return 'OK';
}

/* ── Interactive POS preview (hero) ────────────────────────────────────── */

function PosPreview() {
  const [cart, setCart] = useState<Record<string, number>>({ p1: 2 });
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [query, setQuery] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('CASH');
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [scanPulse, setScanPulse] = useState(false);

  const visible = DEMO_PRODUCTS.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      (query.trim() === '' ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()))
  );

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ product: DEMO_PRODUCTS.find((p) => p.id === id)!, qty }));

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const tax = lines.reduce((sum, l) => sum + l.product.price * l.qty * l.product.taxRate, 0);
  const total = subtotal + tax;

  function addToCart(p: DemoProduct) {
    if (p.stock <= (cart[p.id] || 0)) return;
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  }
  function adjust(id: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) + delta);
      return { ...c, [id]: next };
    });
  }

  function simulateScan() {
    setScanPulse(true);
    const inStock = DEMO_PRODUCTS.filter((p) => p.stock > (cart[p.id] || 0));
    const pick = inStock[Math.floor((Date.now() % inStock.length + inStock.length) % inStock.length)] || inStock[0];
    if (pick) addToCart(pick);
    setTimeout(() => setScanPulse(false), 450);
  }

  function checkout() {
    if (lines.length === 0) return;
    if (online) {
      setSynced((n) => n + 1);
      setFlash('Sale synced — receipt ready');
    } else {
      setPending((n) => n + 1);
      setFlash('Offline — sale queued locally');
    }
    setCart({});
    setTimeout(() => setFlash(null), 2200);
  }

  function goOnline() {
    setOnline(true);
    if (pending > 0) {
      const n = pending;
      setTimeout(() => {
        setSynced((s) => s + n);
        setPending(0);
        setFlash(`Back online — ${n} queued sale${n > 1 ? 's' : ''} synced`);
        setTimeout(() => setFlash(null), 2400);
      }, 900);
    }
  }

  return (
    <div className="glass-card rounded-3xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-4xl">
      {/* device chrome */}
      <div className="bg-[#0b1e33] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/70 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="ml-3">nerva-pos · terminal-04</span>
        </div>
        <button
          onClick={() => (online ? setOnline(false) : goOnline())}
          className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1.5 rounded-full transition ${
            online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {online ? 'Online' : 'Offline — simulate drop'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px]">
        {/* catalog */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <PackageSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or SKU…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/30 focus:border-[#0052ff]"
              />
            </div>
            <button
              onClick={simulateScan}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition ${
                scanPulse ? 'bg-[#0052ff] text-white border-[#0052ff]' : 'border-slate-200 text-slate-600 hover:border-[#0052ff]/40 hover:text-[#0052ff]'
              }`}
            >
              <ScanBarcode className="w-4 h-4" />
              Scan
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['All', ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                  category === c ? 'bg-[#0052ff]/10 text-[#0052ff] border-[#0052ff]/30' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {visible.map((p) => {
              const status = stockStatus(p);
              const disabled = p.stock <= (cart[p.id] || 0);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={disabled}
                  className={`text-left rounded-xl border p-2.5 transition ${
                    disabled ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-[#0052ff]/40 hover:shadow-sm bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-[#0b1e33] leading-tight">{p.name}</span>
                    <span
                      className={`shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        status === 'OK' ? 'bg-emerald-500/10 text-emerald-600' : status === 'LOW' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-[10px] text-slate-400">{p.sku}</span>
                    <span className="text-sm font-bold text-[#0052ff]">${p.price.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* cart */}
        <div className="p-5 flex flex-col bg-slate-50/60">
          <div className="flex items-center gap-2 mb-3 text-[#0b1e33]">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Cart</span>
            {pending > 0 && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {pending} pending sync
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2 mb-3 min-h-[120px]">
            {lines.length === 0 && <p className="text-xs text-slate-400 italic py-6 text-center">Cart is empty — add a product</p>}
            {lines.map(({ product, qty }) => (
              <div key={product.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0b1e33] truncate">{product.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">${(product.price * qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => adjust(product.id, -1)} className="w-5 h-5 grid place-items-center rounded bg-slate-100 hover:bg-slate-200">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-mono w-4 text-center">{qty}</span>
                  <button onClick={() => adjust(product.id, 1)} className="w-5 h-5 grid place-items-center rounded bg-slate-100 hover:bg-slate-200">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => setCart((c) => ({ ...c, [product.id]: 0 }))} className="w-5 h-5 grid place-items-center rounded text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setPayment(m.key)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition ${
                  payment === m.key ? 'bg-[#0b1e33] text-white border-[#0b1e33]' : 'border-slate-200 text-slate-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono space-y-1 mb-3 border-t border-slate-200 pt-2">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-[#0b1e33] font-bold text-sm"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <button
            onClick={checkout}
            disabled={lines.length === 0}
            className="w-full py-2.5 bg-[#0052ff] text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Charge ${total.toFixed(2)}
          </button>

          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{synced} synced this session</span>
            {flash && <span className="text-[#0052ff] font-bold animate-pulse">{flash}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hardware selector ─────────────────────────────────────────────────── */

type HardwareKey = 'mobile' | 'tablet' | 'desktop';
const HARDWARE: Record<HardwareKey, { label: string; icon: typeof Smartphone; blurb: string; specs: string[] }> = {
  mobile: {
    label: 'Mobile Handheld',
    icon: Smartphone,
    blurb: 'A phone in a cashier\'s pocket, ready to ring up a sale anywhere on the floor.',
    specs: ['Camera-based barcode scan', 'BLE pairing to 58mm/80mm thermal printers', 'Runs the full offline queue locally', 'Best for: markets, pop-ups, line-busting'],
  },
  tablet: {
    label: 'Tablet Terminal',
    icon: Tablet,
    blurb: 'The standard front-counter setup — bigger catalog grid, faster multi-item checkout.',
    specs: ['External or camera barcode scan', 'BLE receipt printing (ESC/POS)', 'Shift open/close + cash reconciliation', 'Best for: single-till convenience & grocery counters'],
  },
  desktop: {
    label: 'Desktop All-in-One',
    icon: Monitor,
    blurb: 'A fixed lane for high-volume stores that need a second screen for reports.',
    specs: ['Keyboard-wedge or BLE scanner input', 'Browser-print fallback where BLE isn\'t available', 'Side-by-side POS + reports/inventory tabs', 'Best for: back office doubling as a checkout lane'],
  },
};

function HardwareShowcase() {
  const [active, setActive] = useState<HardwareKey>('tablet');
  const hw = HARDWARE[active];
  const Icon = hw.icon;

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-8 items-start">
      <div className="flex md:flex-col gap-2">
        {(Object.keys(HARDWARE) as HardwareKey[]).map((key) => {
          const item = HARDWARE[key];
          const ItemIcon = item.icon;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex-1 md:flex-none flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition ${
                active === key ? 'bg-[#0052ff]/8 border-[#0052ff]/30 text-[#0052ff]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <ItemIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-3xl p-8 hover-lift">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#0052ff]/10 grid place-items-center">
            <Icon className="w-5 h-5 text-[#0052ff]" />
          </div>
          <h3 className="text-xl font-extrabold text-[#0b1e33]">{hw.label}</h3>
        </div>
        <p className="text-sm text-slate-500 font-medium mb-5">{hw.blurb}</p>
        <ul className="space-y-2">
          {hw.specs.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Offline resilience mini-simulation ────────────────────────────────── */

function OfflineResilienceStrip() {
  const [step, setStep] = useState(0); // 0 selling, 1 dropped, 2 queued, 3 reconnected, 4 synced
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1600);
    return () => clearInterval(t);
  }, []);

  const labels = ['Sale rung up', 'Network drops', 'Queued in local storage', 'Connection returns', 'Auto-synced ✓'];

  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#0052ff] bg-[#0052ff]/8 px-2.5 py-1 rounded-full">
          <RotateCw className="w-3 h-3" /> OFFLINE-RESILIENT
        </span>
        <span className="text-xs text-slate-400 font-medium">Simulated from the real retry queue in <code className="font-mono">lib/pending-sales-queue.ts</code></span>
      </div>
      <div className="flex items-center justify-between">
        {labels.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold transition-colors duration-500 ${
                  i <= step ? 'bg-[#0052ff] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-[11px] text-center font-medium leading-tight ${i <= step ? 'text-[#0b1e33]' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-px flex-1 -mt-6 transition-colors duration-500 ${i < step ? 'bg-[#0052ff]' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Feature cards ──────────────────────────────────────────────────────── */

function InventoryCard() {
  const [restocked, setRestocked] = useState<Set<string>>(new Set());
  const rows = DEMO_PRODUCTS.slice(0, 4);
  return (
    <div className="glass-card rounded-3xl p-6 hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#0052ff]/10 grid place-items-center"><PackageSearch className="w-5 h-5 text-[#0052ff]" /></div>
        <h3 className="text-lg font-extrabold text-[#0b1e33]">Low-stock alerts &amp; restock</h3>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">Every product tracks a reorder level. Once stock drops to it, the item flags itself here — no manual counting.</p>
      <div className="space-y-1.5">
        {rows.map((p) => {
          const status = restocked.has(p.id) ? 'OK' : stockStatus(p);
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-[#0b1e33] truncate">{p.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  status === 'OK' ? 'bg-emerald-500/10 text-emerald-600' : status === 'LOW' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                }`}>{status}</span>
                {status !== 'OK' && (
                  <button
                    onClick={() => setRestocked((s) => new Set(s).add(p.id))}
                    className="text-[10px] font-bold text-[#0052ff] hover:underline"
                  >
                    Restock
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WhatsAppCard() {
  const sections = ['Sales summary', 'Cashier breakdown', 'Low-stock warnings', 'Profit metrics'];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['Sales summary', 'Low-stock warnings']));
  const [freq, setFreq] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  return (
    <div className="glass-card rounded-3xl p-6 hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 grid place-items-center"><MessageCircle className="w-5 h-5 text-emerald-600" /></div>
        <h3 className="text-lg font-extrabold text-[#0b1e33]">WhatsApp owner digests</h3>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">Scheduled reports go straight to WhatsApp — the owner doesn't have to open the console to know how the day went.</p>
      <div className="flex gap-1.5 mb-3">
        {(['Daily', 'Weekly', 'Monthly'] as const).map((f) => (
          <button key={f} onClick={() => setFreq(f)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${freq === f ? 'bg-[#0b1e33] text-white border-[#0b1e33]' : 'border-slate-200 text-slate-500'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-1.5">
        {sections.map((s) => (
          <label key={s} className="flex items-center gap-2 text-xs font-semibold text-[#0b1e33] cursor-pointer">
            <input
              type="checkbox"
              checked={enabled.has(s)}
              onChange={() => setEnabled((set) => {
                const next = new Set(set);
                next.has(s) ? next.delete(s) : next.add(s);
                return next;
              })}
              className="rounded accent-[#0052ff]"
            />
            {s}
          </label>
        ))}
      </div>
    </div>
  );
}

function ShiftReconciliationCard() {
  const opening = 100;
  const cashSales = 342.5;
  const expected = opening + cashSales;
  const [counted, setCounted] = useState('442.50');
  const discrepancy = (parseFloat(counted || '0') || 0) - expected;

  return (
    <div className="glass-card rounded-3xl p-6 hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 grid place-items-center"><ClipboardCheck className="w-5 h-5 text-amber-600" /></div>
        <h3 className="text-lg font-extrabold text-[#0b1e33]">End-of-day cash reconciliation</h3>
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">Closing a shift compares what the register expects against what's actually in the drawer, and logs the gap.</p>
      <div className="text-xs font-mono space-y-1.5 mb-3">
        <div className="flex justify-between text-slate-500"><span>Opening balance</span><span>${opening.toFixed(2)}</span></div>
        <div className="flex justify-between text-slate-500"><span>Cash sales</span><span>${cashSales.toFixed(2)}</span></div>
        <div className="flex justify-between text-[#0b1e33] font-bold"><span>Expected cash</span><span>${expected.toFixed(2)}</span></div>
      </div>
      <label className="text-[11px] font-bold text-slate-500 mb-1 block">Counted cash</label>
      <input
        value={counted}
        onChange={(e) => setCounted(e.target.value.replace(/[^0-9.]/g, ''))}
        className="w-full mb-3 px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/30"
      />
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold font-mono ${
        Math.abs(discrepancy) < 0.01 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
      }`}>
        <span>Discrepancy</span>
        <span>{discrepancy >= 0 ? '+' : ''}${discrepancy.toFixed(2)}</span>
      </div>
    </div>
  );
}

/* ── Role-based tabs ────────────────────────────────────────────────────── */

const ROLE_VIEWS = {
  cashier: {
    label: 'Cashier',
    icon: UserCircle2,
    tag: 'STAFF',
    headline: 'Fast checkout, nothing else in the way.',
    can: ['Scan or search products and ring up sales', 'Accept cash, mobile money, card or store credit', 'Open and close their own till shift'],
    cannot: ["Can't view the customer credit ledger", "Can't view sales reports or profit margins", 'No access to void or refund without a grant'],
  },
  manager: {
    label: 'Store Manager',
    icon: Users,
    tag: 'MANAGER',
    headline: 'Runs the floor: stock, staff, and the till.',
    can: ['Adjust stock, restock, run stock takes', 'Void and refund sales, manage the credit ledger', 'View reports and every staff shift history'],
    cannot: ["Can't delete products outright (owner-only)", "Can't remove staff seats or change billing"],
  },
  owner: {
    label: 'Business Owner',
    icon: Crown,
    tag: 'OWNER',
    headline: 'Full control across the whole workspace.',
    can: ['Everything a manager can, plus staff & seat management', 'Full inventory control including delete', 'Subscription, billing, and workspace settings'],
    cannot: [],
  },
} as const;

function RoleTabs() {
  const [active, setActive] = useState<keyof typeof ROLE_VIEWS>('cashier');
  const view = ROLE_VIEWS[active];
  const Icon = view.icon;

  return (
    <div>
      <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-full bg-slate-100 mb-8">
        {(Object.keys(ROLE_VIEWS) as (keyof typeof ROLE_VIEWS)[]).map((key) => {
          const r = ROLE_VIEWS[key];
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition ${
                active === key ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500'
              }`}
            >
              <r.icon className="w-3.5 h-3.5" />
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-3xl p-8 grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="w-14 h-14 rounded-2xl bg-[#0052ff]/10 grid place-items-center">
          <Icon className="w-7 h-7 text-[#0052ff]" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400">{view.tag} ROLE</span>
          <h3 className="text-2xl font-extrabold text-[#0b1e33] mb-4">{view.headline}</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <ul className="space-y-2">
              {view.can.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
            {view.cannot.length > 0 && (
              <ul className="space-y-2">
                {view.cannot.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-slate-500 font-medium">
                    <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ROI calculator + pricing ──────────────────────────────────────────── */

function RoiAndPricing() {
  const [revenue, setRevenue] = useState(15000);
  const [terminals, setTerminals] = useState(2);
  const [addBundle, setAddBundle] = useState(false);

  // Illustrative estimate, not a measured result: assumes each terminal saves
  // ~25 minutes/day of manual reconciliation + reduces downtime-lost sales by ~0.6%.
  const hoursSavedPerMonth = useMemo(() => Math.round((terminals * 25 * 30) / 60), [terminals]);
  const revenueProtected = useMemo(() => Math.round(revenue * 0.006 * terminals), [revenue, terminals]);

  const plans = [
    {
      name: 'Starter',
      price: 29,
      per: 'per terminal / mo',
      features: ['1 store, unlimited staff seats', 'Offline-first checkout & sync', 'Low-stock alerts', 'Email support'],
    },
    {
      name: 'Professional',
      price: 59,
      per: 'per terminal / mo',
      features: ['Everything in Starter', 'WhatsApp scheduled digests', 'Shift reconciliation & credit ledger', 'Priority support'],
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: null,
      per: 'custom',
      features: ['Everything in Professional', 'Multi-tenant / platform admin tools', 'Dedicated onboarding', 'SLA-backed support'],
    },
  ];

  const bundlePrice = 89;

  return (
    <div className="space-y-16">
      <div className="glass-card rounded-3xl p-8">
        <h3 className="text-xl font-extrabold text-[#0b1e33] mb-1">Estimate your savings</h3>
        <p className="text-sm text-slate-500 font-medium mb-8">A rough estimate based on typical reconciliation time and downtime-related lost sales — not a guarantee.</p>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex justify-between text-sm font-bold text-[#0b1e33] mb-2">
              <span>Monthly revenue</span>
              <span className="font-mono text-[#0052ff]">${revenue.toLocaleString()}</span>
            </div>
            <input
              type="range" min={1000} max={100000} step={1000} value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full accent-[#0052ff]"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm font-bold text-[#0b1e33] mb-2">
              <span>Terminal count</span>
              <span className="font-mono text-[#0052ff]">{terminals}</span>
            </div>
            <input
              type="range" min={1} max={20} step={1} value={terminals}
              onChange={(e) => setTerminals(Number(e.target.value))}
              className="w-full accent-[#0052ff]"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="text-3xl font-extrabold text-[#0052ff]">{hoursSavedPerMonth}h</div>
            <p className="text-xs text-slate-500 font-medium mt-1">estimated reconciliation time saved per month</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="text-3xl font-extrabold text-[#0052ff]">${revenueProtected.toLocaleString()}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">estimated monthly revenue protected from downtime</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-extrabold text-[#0b1e33] mb-1">Plans</h3>
            <p className="text-sm text-slate-500 font-medium">Pick a tier, add the hardware bundle if you need it.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#0b1e33] cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
            <input type="checkbox" checked={addBundle} onChange={() => setAddBundle((v) => !v)} className="accent-[#0052ff]" />
            + Hardware bundle (BLE printer &amp; scanner) — ${bundlePrice}/terminal
          </label>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-3xl p-8 flex flex-col ${p.highlight ? 'bg-[#0b1e33] text-white shadow-xl scale-[1.02]' : 'glass-card'}`}>
              <h4 className={`text-lg font-extrabold mb-1 ${p.highlight ? 'text-white' : 'text-[#0b1e33]'}`}>{p.name}</h4>
              <div className="mb-6">
                {p.price !== null ? (
                  <>
                    <span className={`text-4xl font-extrabold ${p.highlight ? 'text-white' : 'text-[#0b1e33]'}`}>
                      ${addBundle ? p.price + bundlePrice : p.price}
                    </span>
                    <span className={`text-xs font-mono ml-1 ${p.highlight ? 'text-white/60' : 'text-slate-400'}`}>{p.per}</span>
                  </>
                ) : (
                  <span className={`text-4xl font-extrabold ${p.highlight ? 'text-white' : 'text-[#0b1e33]'}`}>Custom</span>
                )}
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm font-medium ${p.highlight ? 'text-white/85' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? 'text-[#4d8dff]' : 'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.price !== null ? '/auth/register' : '#contact'}
                className={`text-center py-3 rounded-xl text-sm font-bold transition ${
                  p.highlight ? 'bg-[#0052ff] text-white hover:bg-blue-500' : 'bg-[#0b1e33] text-white hover:bg-[#0052ff]'
                }`}
              >
                {p.price !== null ? 'Start free trial' : 'Talk to sales'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-[#0052ff]/10">
      {/* FLOATING HEADER */}
      <div className="fixed top-6 left-0 right-0 w-[92%] max-w-7xl mx-auto z-50 flex items-center justify-between pointer-events-none">
        <div className="
          pointer-events-auto flex items-center gap-3 px-6 py-3.5 rounded-[2rem]
          bg-white/85 backdrop-blur-2xl
          border-t border-l border-white/80 border-b border-r border-slate-200/60
          shadow-[0_35px_70px_-15px_rgba(0,82,255,0.28),0_18px_36px_-10px_rgba(0,82,255,0.15),0_6px_16px_-4px_rgba(11,30,51,0.18),inset_0_2px_4px_0_rgba(255,255,255,0.9),inset_0_-2px_6px_0_rgba(11,30,51,0.06)]
          transition-all duration-300 ease-out
          hover:-translate-y-1.5 hover:scale-105
          hover:shadow-[0_45px_85px_-15px_rgba(0,82,255,0.38),0_20px_40px_-8px_rgba(0,82,255,0.2),0_10px_24px_-6px_rgba(11,30,51,0.2),inset_0_2px_4px_0_rgba(255,255,255,1),inset_0_-2px_6px_0_rgba(11,30,51,0.08)]
        ">
          <span className="font-mono text-lg font-extrabold tracking-tight text-[#0b1e33] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0052ff] status-pulse" />
            NERVA<span className="text-[#0052ff]">.</span>
          </span>
        </div>

        <nav className="
          pointer-events-auto flex items-center gap-6 md:gap-8 pl-6 pr-3 py-2 rounded-full
          bg-white/75 backdrop-blur-xl
          border-t border-l border-white/80 border-b border-r border-slate-200/60
          shadow-[0_25px_50px_-12px_rgba(0,82,255,0.12),0_4px_12px_-4px_rgba(11,30,51,0.05),inset_0_1px_1px_0_rgba(255,255,255,0.8)]
          transition-all duration-300 ease-out
          hover:shadow-[0_30px_55px_-10px_rgba(0,82,255,0.18)]
        ">
          <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-500">
            <a href="#hardware" className="hover:text-[#0052ff] transition-colors duration-200">Hardware</a>
            <a href="#features" className="hover:text-[#0052ff] transition-colors duration-200">Features</a>
            <a href="#roles" className="hover:text-[#0052ff] transition-colors duration-200">Roles</a>
            <a href="#pricing" className="hover:text-[#0052ff] transition-colors duration-200">Pricing</a>
          </div>
          <span className="hidden md:inline-block w-px h-5 bg-slate-200" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-[#0052ff] transition">
              Sign In
            </Link>
            <Link href="/auth/register" className="px-5 py-2.5 bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_8px_20px_-6px_rgba(0,82,255,0.4)] hover:bg-blue-700 transition-all duration-200 hover:scale-[1.03]">
              Start Free Trial
            </Link>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <main className="relative pt-48 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center">
        <div className="fade-up inline-flex items-center gap-2 px-4 py-2 badge-tier rounded-full text-xs font-mono mb-8 font-bold">
          <span className="telemetry-dot bg-[#0052ff] status-pulse" />
          OFFLINE-FIRST POS · BUILT FOR RETAIL
        </div>

        <h1 className="fade-up text-5xl md:text-7xl font-extrabold text-center tracking-tight leading-none max-w-4xl mb-6 text-[#0b1e33]">
          Lightning-fast checkout.<br />
          <span className="gradient-text">Continuous offline operations.</span>
        </h1>

        <p className="fade-up text-lg md:text-xl text-slate-500 text-center max-w-2xl font-medium leading-relaxed mb-10">
          Scan, sell, and print receipts even when the connection drops — every sale queues locally and syncs the moment you're back online. Below is the actual checkout flow, not a screenshot.
        </p>

        <div className="fade-up flex flex-col sm:flex-row gap-4 mb-16 w-full justify-center max-w-md">
          <Link href="/auth/register" className="px-8 py-4 bg-[#0052ff] text-white font-bold rounded-xl text-center shadow-lg hover:bg-blue-700 hover-lift flex items-center justify-center gap-2">
            <Rocket className="w-4 h-4" />
            Start Free Trial
          </Link>
          <a href="#demo" className="px-8 py-4 bg-white text-slate-700 font-bold rounded-xl text-center border border-slate-200 hover:bg-slate-50 transition shadow-sm hover-lift flex items-center justify-center gap-2">
            Try Interactive Demo
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* HERO DEMO */}
        <section id="demo" className="w-full flex justify-center mb-24">
          <PosPreview />
        </section>

        {/* HARDWARE */}
        <section id="hardware" className="w-full mb-24">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">One app, any counter</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">The same checkout runs on whatever hardware is already on the counter.</p>
          </div>
          <HardwareShowcase />
        </section>

        {/* OFFLINE RESILIENCE */}
        <section className="w-full mb-24">
          <OfflineResilienceStrip />
        </section>

        {/* FEATURE CARDS */}
        <section id="features" className="w-full mb-24">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">What's actually running under the hood</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">Three of the workflows already built into the console — try them below.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InventoryCard />
            <WhatsAppCard />
            <ShiftReconciliationCard />
          </div>
        </section>

        {/* ROLES */}
        <section id="roles" className="w-full mb-24">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">Built around who's using it</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">Cashiers, managers, and owners see different tools — and different data — by design.</p>
          </div>
          <RoleTabs />
        </section>

        {/* ROI + PRICING */}
        <section id="pricing" className="w-full mb-24">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#0b1e33] mb-3">Plans that scale with your terminals</h2>
            <p className="text-slate-500 text-sm max-w-lg font-medium">Start free, add hardware and seats as you grow.</p>
          </div>
          <RoiAndPricing />
        </section>

        {/* PUNCHLINE BEFORE FOOTER */}
        <div className="w-full text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0b1e33]">
            Never lose a sale to a<br />bad connection. <span className="text-[#0052ff]">Try Nerva.</span>
          </h2>
        </div>
      </main>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-slate-200 bg-white pt-16 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-12 text-xs">
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">EXPLORE</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><a href="#demo" className="hover:text-[#0052ff]">Interactive Demo</a></li>
              <li><a href="#hardware" className="hover:text-[#0052ff]">Hardware</a></li>
              <li><a href="#features" className="hover:text-[#0052ff]">Features</a></li>
              <li><a href="#pricing" className="hover:text-[#0052ff]">Pricing</a></li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">ACCOUNT</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><Link href="/login" className="hover:text-[#0052ff]">Sign In</Link></li>
              <li><Link href="/auth/register" className="hover:text-[#0052ff]">Start Free Trial</Link></li>
              <li><Link href="/admin" className="hover:text-[#0052ff]">Open Console</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">CONTACT</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li>Sales: sales@nerva.systems</li>
              <li>Support: ops@nerva.systems</li>
            </ul>
          </div>
          <div>
            <div className="font-mono font-extrabold text-[#0b1e33] mb-4">LEGAL</div>
            <ul className="space-y-2 text-slate-500 font-medium">
              <li><a href="#" className="hover:text-[#0052ff]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#0052ff]">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-100 pt-6 text-center text-xs text-slate-400 font-mono">
          &copy; {new Date().getFullYear()} Nerva Intelligence Systems. Operating with extreme local resilience.
        </div>
      </footer>
    </div>
  );
}
