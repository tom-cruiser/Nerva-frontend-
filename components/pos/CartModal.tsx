// components/pos/CartModal.tsx
'use client';
import React from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface CartItem {
  sku: string;
  name: string;
  price: number;
  qty: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (sku: string, qty: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
  method: 'CASH' | 'MOMO' | 'CREDIT' | 'CARD';
  setMethod: (method: 'CASH' | 'MOMO' | 'CREDIT' | 'CARD') => void;
  onCharge: () => void;
  isCharging: boolean;
  isCharged: boolean;
}

export default function CartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  subtotal,
  tax,
  total,
  method,
  setMethod,
  onCharge,
  isCharging,
  isCharged,
}: CartModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 flex items-center gap-2">
              <svg className="text-[#0052ff] w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Cart
              <Badge color="blue" className="ml-1">{cart.length} items</Badge>
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors whitespace-nowrap"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-zinc-650">Your cart is empty</p>
                <p className="text-sm text-zinc-400 mt-1">Add products from the catalog to get started.</p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.sku}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-50/80 rounded-xl border border-zinc-200/50 hover:border-zinc-300 transition-all"
              >
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-bold text-zinc-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-zinc-500 font-mono">{item.sku}</p>
                    <p className="text-xs font-bold text-[#0052ff] font-mono">XAF {item.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 order-3 sm:order-none w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200 p-1">
                    <button
                      onClick={() => onUpdateQty(item.sku, item.qty - 1)}
                      className="w-7 h-7 rounded-md hover:bg-zinc-100 text-zinc-600 hover:text-[#0052ff] transition-colors flex items-center justify-center text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold text-zinc-800">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.sku, item.qty + 1)}
                      className="w-7 h-7 rounded-md hover:bg-zinc-100 text-zinc-600 hover:text-[#0052ff] transition-colors flex items-center justify-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <p className="text-sm font-bold text-zinc-800 font-mono">
                      XAF {(item.price * item.qty).toLocaleString()}
                    </p>
                    <button
                      onClick={() => onRemoveItem(item.sku)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary and Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-zinc-200/60 px-4 sm:px-6 py-4 sm:py-5 bg-white/95 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-700">XAF {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-medium">
                  <span>Tax (5%)</span>
                  <span className="font-mono text-zinc-700">XAF {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-900 font-black text-base sm:text-lg pt-2 border-t border-zinc-200/50">
                  <span>Total</span>
                  <span className="text-[#0052ff] font-mono text-lg sm:text-xl">XAF {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['CASH', 'MOMO', 'CREDIT', 'CARD'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${
                      method === m
                        ? 'bg-[#0052ff] border-[#0052ff] text-white shadow-sm'
                        : 'bg-zinc-50 border-zinc-200/70 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100/50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <Button
                className="w-full py-3.5 text-sm font-bold uppercase tracking-wider rounded-xl bg-[#0052ff] hover:bg-[#003bbf] text-white shadow-md shadow-[#0052ff]/10"
                size="lg"
                loading={isCharging}
                onClick={onCharge}
                disabled={isCharged}
              >
                {isCharging ? 'Processing...' : isCharged ? '✓ Paid' : `Charge XAF ${total.toLocaleString()}`}
              </Button>

              {isCharged && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold justify-center bg-emerald-50 py-2.5 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Payment successful! Your order has been processed.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}