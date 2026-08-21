'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RequireRole from '@/components/RequireRole';
import ProductCard from '@/components/pos/ProductCard';
import CartModal from '@/components/pos/CartModal';
import CustomerPickerModal, { PickedCustomer } from '@/components/pos/CustomerPickerModal';
import ReceiptModal, { ReceiptData } from '@/components/pos/ReceiptModal';
import { useAuth } from '@/app/context/AuthContext';
import { inventory, sync, ledger } from '@/lib/endpoints';
import { ApiError, uuid } from '@/lib/api';
import { getDeviceId, nowTimestamptz } from '@/lib/tenancy';
import { useTenantLock } from '@/lib/tenant-status';
import { enqueuePendingSale, usePendingSalesCount } from '@/lib/pending-sales-queue';
import { flushPendingSales } from '@/lib/sync-retry';
import type { Product, SyncChange, SyncResponse } from '@/lib/types';

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

type CartItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  id?: string;
  /** Percentage tax rate (0-100) this product was tagged with in Inventory —
   *  set per product by the shop owner, not a flat store-wide rate. */
  taxRate: number;
};
type PaymentMethod = 'CASH' | 'MOMO' | 'CREDIT' | 'CARD';

/** Sleep helper for polling the sync job status (slow-batch / 202 path). */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isSyncResponse(value: unknown): value is SyncResponse {
  return !!value && typeof value === 'object' && 'accepted_changes' in value;
}

export default function PosPage() {
  const { tenantId, hasPermission, user } = useAuth();
  const { locked: isTenantLocked } = useTenantLock();
  const pendingSalesCount = usePendingSalesCount();

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [selectedCustomer, setSelectedCustomer] = useState<PickedCustomer | null>(null);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [isCharged, setIsCharged] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // State for real data
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  // ─── Categories from real data ──────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Uncategorized'));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // ─── Fetch Products from Backend ────────────────────────────────────────────
  const loadProducts = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    setError(null);
    try {
      const response = await inventory.listProducts();
      // Handle different response formats
      let productList: Product[] = [];
      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          productList = response;
        } else if ('products' in response && Array.isArray(response.products)) {
          productList = response.products;
        } else if ('data' in response && Array.isArray(response.data)) {
          productList = response.data;
        } else {
          // Try to extract products from response
          productList = Object.values(response).flat().filter(
            (item: any) => item && typeof item === 'object' && 'product_sku' in item
          ) as Product[];
        }
      }
      setProducts(productList);
    } catch (err) {
      console.error('Failed to load products:', err);
      if (err instanceof ApiError) {
        if (err.isNotImplemented) {
          setError('Inventory API not implemented. Using sample data.');
          loadSampleProducts();
        } else if (err.isNotFound) {
          setError('Products endpoint not found. Using sample data.');
          loadSampleProducts();
        } else {
          setError(`Failed to load products: ${err.message}`);
          loadSampleProducts();
        }
      } else {
        setError('Failed to load products. Please check your connection.');
        loadSampleProducts();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Load Sample Products (Fallback) ──────────────────────────────────────
  const loadSampleProducts = () => {
    const sampleProducts: Product[] = [
      { id: '1', product_sku: 'RICE-50KG', name: 'Rice 50kg', barcode: null, description: null, unit_price: 18000, stock_quantity: 2, reorder_level: 5, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Rice', updated_at: new Date().toISOString(), deleted_at: null },
      { id: '2', product_sku: 'COIL-2L', name: 'Cooking Oil 2L', barcode: null, description: null, unit_price: 2800, stock_quantity: 0, reorder_level: 3, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Oil', updated_at: new Date().toISOString(), deleted_at: null },
      { id: '3', product_sku: 'SUGA-25KG', name: 'Sugar 25kg', barcode: null, description: null, unit_price: 9200, stock_quantity: 24, reorder_level: 5, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Sugar', updated_at: new Date().toISOString(), deleted_at: null },
      { id: '4', product_sku: 'TOMA-400G', name: 'Tomato Paste 400g', barcode: null, description: null, unit_price: 650, stock_quantity: 88, reorder_level: 10, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Canned', updated_at: new Date().toISOString(), deleted_at: null },
      { id: '5', product_sku: 'SOAP-LUX', name: 'Lux Soap ×12', barcode: null, description: null, unit_price: 4200, stock_quantity: 15, reorder_level: 5, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Soap', updated_at: new Date().toISOString(), deleted_at: null },
      { id: '6', product_sku: 'MILK-1L', name: 'UHT Milk 1L', barcode: null, description: null, unit_price: 1200, stock_quantity: 6, reorder_level: 3, reorder_quantity: null, base_unit: 'pieces', cost_price: null, tax_rate: 0, version: 1, category: 'Dairy', updated_at: new Date().toISOString(), deleted_at: null },
    ];
    setProducts(sampleProducts);
  };

  // ─── Load products on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Retry any sale batches queued from a previous network failure (see
  // lib/pending-sales-queue.ts) whenever a cashier lands on this page — a
  // cheap no-op if the queue is empty. components/TenantStatusBanner.tsx
  // also retries on the `online` event app-wide; this covers "opened POS
  // again" specifically.
  useEffect(() => {
    void flushPendingSales();
  }, []);

  // Safety net for clearCart()'s own reset: a cart can also empty out one
  // item at a time via removeItem, with no single call site to reset
  // selectedCustomer from. Without this, a customer picked for the previous
  // (now-abandoned) cart would silently still be attached to whatever gets
  // rung up next — this catches that regardless of how the cart got empty.
  useEffect(() => {
    if (cart.length === 0 && selectedCustomer) {
      setSelectedCustomer(null);
    }
  }, [cart.length, selectedCustomer]);

  // ─── Filter products ─────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const matchesQuery =
        p.name.toLowerCase().includes(query) || 
        p.product_sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query));
      const matchesCategory =
        !selectedCategory || 
        selectedCategory === 'All' || 
        (p.category || 'Uncategorized') === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [searchQuery, selectedCategory, products]);

  // ─── Cart Functions ─────────────────────────────────────────────────────────
  const getCartQuantity = (sku: string) => {
    const item = cart.find(c => c.sku === sku);
    return item?.qty || 0;
  };

  const addToCart = (product: Product) => {
    if (product.stock_quantity === 0) return;

    const currentQty = getCartQuantity(product.product_sku);
    if (currentQty >= product.stock_quantity) {
      setStockNotice(`Only ${product.stock_quantity} of ${product.name} in stock.`);
      setTimeout(() => setStockNotice(null), 2500);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.sku === product.product_sku);
      if (existing) {
        return prev.map(c =>
          c.sku === product.product_sku ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, {
        sku: product.product_sku,
        name: product.name,
        price: product.unit_price,
        qty: 1,
        stock: product.stock_quantity,
        id: product.id,
        taxRate: product.tax_rate,
      }];
    });
  };

  const updateQty = (sku: string, qty: number) => {
    if (qty <= 0) {
      removeItem(sku);
      return;
    }
    setCart(prev => prev.map(c => c.sku === sku ? { ...c, qty } : c));
  };

  // Mirrors the addToCart stock guard for the desktop sidebar's own "+"
  // stepper (a separate rendering of the cart from CartModal, same bug
  // surface): block the increment once qty reaches the item's stock.
  const incrementCartItem = (item: CartItem) => {
    if (item.qty >= item.stock) {
      setStockNotice(`Only ${item.stock} of ${item.name} in stock.`);
      setTimeout(() => setStockNotice(null), 2500);
      return;
    }
    updateQty(item.sku, item.qty + 1);
  };

  const removeItem = (sku: string) => {
    setCart(prev => prev.filter(c => c.sku !== sku));
  };

  const clearCart = () => {
    setCart([]);
    setIsCharged(false);
    setSelectedCustomer(null);
  };

  // Recording a credit sale needs 'ledger:credit' (and 'ledger:read' to even
  // list customers to pick from) — cashiers don't get these by default (per
  // admin3.md, they shouldn't see the customer debt book), though an
  // owner/manager can grant an individual seat "Ledger access" from
  // Settings → Team. Fail with a clear message here rather than opening a
  // picker whose first request would just 403.
  const openCustomerPicker = () => {
    if (!hasPermission('ledger:credit') || !hasPermission('ledger:read')) {
      setChargeError("You don't have permission to record credit sales — ask an owner or manager.");
      return;
    }
    setIsCustomerPickerOpen(true);
  };

  // Picking CREDIT is what triggers the customer picker — a credit sale is
  // meaningless without knowing whose debt it is. Re-picking CASH/MOMO/CARD
  // never needs one, and if the cashier already chose a customer and comes
  // back to CREDIT, there's no need to make them pick again.
  const handleSelectMethod = (m: PaymentMethod) => {
    setMethod(m);
    if (m === 'CREDIT' && !selectedCustomer) {
      openCustomerPicker();
    }
  };

  const handleSelectCustomer = (customer: PickedCustomer) => {
    setSelectedCustomer(customer);
    setIsCustomerPickerOpen(false);
  };

  // ─── Calculate totals ────────────────────────────────────────────────────────
  // No flat/general tax rate — each product carries its own tax_rate (set by
  // the shop owner in Inventory), so the sale's tax is the sum of each
  // line's own price × qty × rate, not one rate applied to the whole cart.
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(
    cart.reduce((sum, item) => sum + item.price * item.qty * (item.taxRate / 100), 0),
  );
  const total = subtotal + tax;

  // ─── Handle Payment ─────────────────────────────────────────────────────────
  // Sales go through the same offline-first sync protocol WatermelonDB would
  // use (POST /api/v1/sync/batch): there is no separate "create sale" REST
  // endpoint. A CREATE change on the `sales` collection is enough to record
  // the transaction and let the backend apply the matching stock decrement.
  const handleCharge = async () => {
    if (cart.length === 0 || isCharging) return;

    if (!tenantId) {
      setChargeError('No active tenant on this session. Please log in again.');
      return;
    }

    if (isTenantLocked) {
      setChargeError('Store is suspended — new sales are blocked until it is reactivated.');
      return;
    }

    // A credit sale with nobody attached to it isn't a debt anyone can ever
    // collect on — require a customer before it's even submitted, rather
    // than discovering the gap later on the ledger page.
    if (method === 'CREDIT' && !selectedCustomer) {
      setChargeError('Select or add a customer to record this sale on credit.');
      openCustomerPicker();
      return;
    }

    setIsCharging(true);
    setChargeError(null);

    const transactionId = uuid();
    const change: SyncChange = {
      id: uuid(),
      collection: 'sales',
      action: 'CREATE',
      data: {
        transaction_id: transactionId,
        customer_id: method === 'CREDIT' ? selectedCustomer!.id : undefined,
        items_sold: cart.map(item => ({
          product_sku: item.sku,
          quantity: item.qty,
          unit_price: item.price,
          total: item.price * item.qty,
        })),
        total_amount: total,
        discount_amount: 0,
        tax_amount: tax,
        payment_method: method,
        payment_status: method === 'CREDIT' ? 'PENDING' : 'PAID',
        sale_timestamp: nowTimestamptz(),
      },
      updated_at: nowTimestamptz(),
      client_created_at: nowTimestamptz(),
      device_id: getDeviceId(),
    };

    // Snapshot of what to print — captured now, independent of `cart`/etc.
    // resetting a moment later, and shown regardless of which of the three
    // outcomes below the sale lands in: the goods have already changed
    // hands by the time "Charge" was clicked, so the customer gets a
    // receipt either way, even if server confirmation is still pending.
    const buildReceipt = (): ReceiptData => ({
      transactionId,
      timestamp: nowTimestamptz(),
      items: cart.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty, price: item.price })),
      subtotal,
      tax,
      total,
      method,
      customerName: method === 'CREDIT' ? selectedCustomer?.name : undefined,
      workerTag: user?.workerTag ?? 'unknown',
    });

    // Records this sale's amount against the customer's ledger balance once
    // (and only once) the sale itself is confirmed accepted — never before,
    // so a rejected sale (e.g. insufficient stock) can't still leave a debt
    // behind. Runs through @retail/ledger-payments' own dedicated credit
    // endpoint (not the sales-sync `ledger_entries` collection), which
    // computes the new balance server-side.
    //
    // KNOWN GAP: only covers the fast/online path below. A sale that goes
    // through the slow-poll or offline-queue fallback further down still
    // completes as a sale, but its ledger credit is NOT retried the way the
    // sale itself is — that customer's debt has to be added manually from
    // the Ledgers page if it happens to land in one of those paths.
    const recordCreditForThisSale = async () => {
      if (method !== 'CREDIT' || !selectedCustomer) return;
      try {
        await ledger.recordCredit(selectedCustomer.id, total, `POS sale ${transactionId}`);
      } catch (err) {
        console.error('Sale succeeded but recording the ledger credit failed:', err);
        setChargeError(
          `Sale recorded, but adding XAF ${total.toLocaleString()} to ${selectedCustomer.name}'s ledger failed — `
          + 'please record this credit manually from the Ledgers page.',
        );
      }
    };

    try {
      let result = await sync.pushBatch({
        tenant_id: tenantId,
        device_id: getDeviceId(),
        changes: [change],
      });

      // Large batches return 202 + a jobId instead of the result inline —
      // poll a few times before giving up on the fast path.
      if (!isSyncResponse(result)) {
        const jobId = (result as unknown as { jobId?: string }).jobId;
        if (!jobId) throw new Error('Unexpected response from the sync service.');

        let polled: SyncResponse | null = null;
        for (let attempt = 0; attempt < 8 && !polled; attempt++) {
          await sleep(1000);
          const status = await sync.getStatus(jobId);
          if (isSyncResponse(status)) polled = status;
        }
        if (!polled) {
          // Still processing — the sale is queued server-side, not lost.
          // (See recordCreditForThisSale's KNOWN GAP comment above — this
          // path doesn't know yet whether the sale will even be accepted,
          // so it deliberately does not record a ledger credit.)
          setIsCharged(true);
          setLastReceipt(buildReceipt());
          setTimeout(() => {
            setCart([]);
            setIsCharged(false);
            setIsCartOpen(false);
            setSelectedCustomer(null);
          }, 2000);
          return;
        }
        result = polled;
      }

      const rejection = result.rejected_changes.find(r => r.id === change.id);
      if (rejection) {
        throw new Error(rejection.reason || 'The sale was rejected by the server.');
      }

      setIsCharged(true);
      setLastReceipt(buildReceipt());
      await recordCreditForThisSale();

      // Optimistically reflect the stock decrement, then reconcile silently
      // against the server (a trigger there adjusts the real inventory row).
      setProducts(prev =>
        prev.map(p => {
          const sold = cart.find(c => c.sku === p.product_sku);
          return sold ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - sold.qty) } : p;
        }),
      );
      loadProducts({ silent: true });

      setTimeout(() => {
        setCart([]);
        setIsCharged(false);
        setIsCartOpen(false);
        setSelectedCustomer(null);
      }, 2000);
    } catch (err) {
      console.error('Payment failed:', err);
      if (err instanceof ApiError) {
        if (err.isLocked) {
          setChargeError('Store is suspended — new sales are blocked until it is reactivated.');
        } else if (err.isForbidden) {
          setChargeError("You don't have permission to record sales.");
        } else if (err.status === 409) {
          setChargeError('This sale is already being processed. Please wait a moment.');
        } else if (err.isServiceUnavailable || err.isUnreachable) {
          // Network/service is down, not a rejection of the sale itself —
          // queue it for automatic retry (see lib/pending-sales-queue.ts)
          // rather than making the cashier lose the transaction. No ledger
          // credit is recorded here either, for the same reason as the
          // slow-poll path above — see recordCreditForThisSale's KNOWN GAP
          // comment; whoever reconciles the pending-sales queue later needs
          // to also add this credit manually if this was a CREDIT sale.
          enqueuePendingSale(
            { tenant_id: tenantId, device_id: getDeviceId(), changes: [change] },
            change.id,
          );
          setIsCharged(true);
          setLastReceipt(buildReceipt());
          setProducts(prev =>
            prev.map(p => {
              const sold = cart.find(c => c.sku === p.product_sku);
              return sold ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - sold.qty) } : p;
            }),
          );
          setTimeout(() => {
            setCart([]);
            setIsCharged(false);
            setIsCartOpen(false);
            setSelectedCustomer(null);
          }, 2000);
        } else {
          setChargeError(err.message);
        }
      } else {
        setChargeError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      }
    } finally {
      setIsCharging(false);
    }
  };

  // ─── Total items ────────────────────────────────────────────────────────────
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // ─── Toggle cart ────────────────────────────────────────────────────────────
  const toggleCart = () => {
    if (cart.length === 0) return;
    setIsCartOpen(!isCartOpen);
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-64px)] bg-zinc-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0052ff] border-t-transparent mx-auto"></div>
          <p className="text-zinc-500 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <RequireRole requiredPermission="sales:create">
      <div className="flex flex-col h-[calc(100dvh-64px)] bg-zinc-50/50">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Desktop Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ── Left: Product Grid ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 sm:p-4 border-b border-zinc-200/50 bg-white/60 backdrop-blur-md sticky top-0 z-10">
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <Input
                    icon={SEARCH_ICON}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products by name or SKU…"
                    className="text-sm bg-zinc-50/80 border-zinc-200/70 focus:border-[#0052ff]/60 focus:bg-white text-zinc-800"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all
                        ${selectedCategory === (cat === 'All' ? null : cat)
                          ? 'bg-[#0052ff] text-white shadow-md'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {stockNotice && (
                <div className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {stockNotice}
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 pb-28 lg:pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3 auto-rows-min">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.product_sku}
                    product={{
                      sku: product.product_sku,
                      name: product.name,
                      price: product.unit_price,
                      stock: product.stock_quantity,
                    }}
                    onAdd={() => addToCart(product)}
                    quantityInCart={getCartQuantity(product.product_sku)}
                    isDisabled={product.stock_quantity === 0}
                  />
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-400">
                    <svg className="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <p className="text-sm font-bold">No products found</p>
                    <p className="text-xs mt-1">Try adjusting your search</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Cart Sidebar (Desktop) ── */}
          <div className="hidden lg:flex lg:w-80 xl:w-[380px] flex-col bg-white border-l border-zinc-200/60 shadow-lg">
            {/* Cart Header */}
            <div className="px-5 py-4 border-b border-zinc-200/50 flex items-center justify-between bg-white/50">
              <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Cart
                {totalItems > 0 && (
                  <Badge color="blue" className="ml-1">{totalItems}</Badge>
                )}
                {pendingSalesCount > 0 && (
                  <Badge color="amber" className="ml-1">{pendingSalesCount} pending sync</Badge>
                )}
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-zinc-50/30">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-650">Your cart is empty</p>
                    <p className="text-xs text-zinc-400 mt-1">Tap products to add them to your sale.</p>
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.sku} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-200/50 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{item.name}</p>
                      <p className="text-xs text-[#0052ff] font-bold font-mono mt-0.5">
                        XAF {(item.price * item.qty).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-100/70 p-1 rounded-lg border border-zinc-200/20">
                      <button
                        onClick={() => updateQty(item.sku, item.qty - 1)}
                        className="w-6 h-6 rounded-md bg-white text-zinc-600 hover:text-[#0052ff] border border-zinc-200/30 shadow-sm text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm text-zinc-800 font-extrabold">{item.qty}</span>
                      <button
                        onClick={() => incrementCartItem(item)}
                        disabled={item.qty >= item.stock}
                        className="w-6 h-6 rounded-md bg-white text-zinc-600 hover:text-[#0052ff] border border-zinc-200/30 shadow-sm text-sm font-bold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Summary */}
            {cart.length > 0 && (
              <div className="px-5 py-5 border-t border-zinc-200/60 space-y-4 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.03)]">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-500 font-semibold">
                    <span>Subtotal</span>
                    <span className="font-mono text-zinc-700">XAF {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 font-semibold">
                    <span>Tax</span>
                    <span className="font-mono text-zinc-700">XAF {tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 font-black text-sm pt-2 border-t border-zinc-200/50">
                    <span>Total</span>
                    <span className="text-[#0052ff] font-mono text-base">XAF {total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CASH', 'MOMO', 'CREDIT', 'CARD'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => handleSelectMethod(m)}
                      className={`py-2 rounded-lg text-[10px] font-extrabold border transition-all ${
                        method === m
                          ? 'bg-[#0052ff] border-[#0052ff] text-white shadow-sm'
                          : 'bg-zinc-50 border-zinc-200/70 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {method === 'CREDIT' && (
                  <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2">
                    {selectedCustomer ? (
                      <p className="text-xs font-bold text-amber-800 truncate">
                        Customer: <span className="text-zinc-800">{selectedCustomer.name}</span>
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-amber-700">No customer selected</p>
                    )}
                    <button
                      onClick={openCustomerPicker}
                      className="text-[11px] font-bold text-[#0052ff] uppercase tracking-wider shrink-0"
                    >
                      {selectedCustomer ? 'Change' : 'Select'}
                    </button>
                  </div>
                )}

                {chargeError && (
                  <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
                    {chargeError}
                  </div>
                )}

                <Button
                  className="w-full py-3 text-sm font-bold uppercase tracking-wider rounded-xl bg-[#0052ff] hover:bg-[#003bbf] text-white shadow-md shadow-[#0052ff]/10"
                  size="lg"
                  loading={isCharging}
                  onClick={handleCharge}
                  disabled={isCharged || isTenantLocked || (method === 'CREDIT' && !selectedCustomer)}
                >
                  {isCharging ? 'Processing…' : isCharged ? '✓ Paid' : isTenantLocked ? 'Store suspended' : `Charge XAF ${total.toLocaleString()}`}
                </Button>

                {isCharged && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold justify-center bg-emerald-50 py-2 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Payment successful!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: Floating Cart Button ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none">
          <button
            onClick={toggleCart}
            className={`
              pointer-events-auto w-full py-4 rounded-2xl bg-[#0052ff] text-white font-bold shadow-xl flex items-center justify-between px-5 sm:px-6
              transition-all duration-200 hover:bg-[#003bbf] active:scale-[0.98]
              ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl'}
            `}
            disabled={cart.length === 0}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              <span className="text-sm sm:text-base">View Cart</span>
              {totalItems > 0 && (
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-mono">XAF {total.toLocaleString()}</span>
          </button>
        </div>

        {/* ── Cart Modal (Mobile/Tablet) ── */}
        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQty={updateQty}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          method={method}
          onSelectMethod={handleSelectMethod}
          selectedCustomer={selectedCustomer}
          onChangeCustomer={openCustomerPicker}
          onCharge={handleCharge}
          isCharging={isCharging}
          isCharged={isCharged}
          error={chargeError}
        />
      </div>

      {/* Customer Picker — opened when CREDIT is selected as the payment
          method, from either the desktop sidebar or the mobile CartModal. */}
      <CustomerPickerModal
        isOpen={isCustomerPickerOpen}
        onClose={() => setIsCustomerPickerOpen(false)}
        onSelect={handleSelectCustomer}
      />

      {/* Receipt — pops up right after a successful charge; printing it is
          independent of the cart's own auto-clear a couple seconds later. */}
      <ReceiptModal
        isOpen={lastReceipt !== null}
        onClose={() => setLastReceipt(null)}
        receipt={lastReceipt}
      />

      {/* Hide scrollbar styles */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </RequireRole>
  );
}