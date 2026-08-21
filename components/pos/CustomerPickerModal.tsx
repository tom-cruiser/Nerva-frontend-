// components/pos/CustomerPickerModal.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ledger } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import AddCustomerModal from '@/components/ledgers/AddCustomerModal';

export interface PickedCustomer {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: PickedCustomer) => void;
}

const SEARCH_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

/**
 * Who is this credit sale for? Shown the moment CREDIT is picked as the
 * payment method in POS — pick an existing ledger customer, or add a new
 * one on the spot (reuses the same AddCustomerModal the Ledgers page uses,
 * so a customer created from here shows up there too, and vice versa).
 */
export default function CustomerPickerModal({ isOpen, onClose, onSelect }: CustomerPickerModalProps) {
  const [customers, setCustomers] = useState<PickedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    ledger
      .getCustomers()
      .then((res) => setCustomers(res.customers))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load customers.'))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
  }, [customers, query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Hide the picker itself (rather than unmounting) while the nested
          "add customer" form is open, so returning from it doesn't need to
          re-fetch anything. */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${isAddCustomerOpen ? 'hidden' : ''}`}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-200/60 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Select Customer</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Who is this credit sale for?</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-3 border-b border-zinc-200/60">
            <Input
              icon={SEARCH_ICON}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-zinc-400 gap-3">
                <span className="w-5 h-5 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
                <span className="font-semibold text-xs uppercase tracking-wider">Loading customers…</span>
              </div>
            ) : error ? (
              <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5 m-3">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">
                {customers.length === 0 ? 'No customers yet — add one below.' : `No customers match "${query}".`}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0052ff]/[0.04] transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-800 truncate">{c.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{c.phone}</p>
                    </div>
                    <p
                      className={`text-sm font-bold font-mono shrink-0 ${c.balance > 0 ? 'text-amber-600' : 'text-zinc-400'}`}
                    >
                      XAF {c.balance.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-zinc-200/60">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddCustomerOpen(true)}
            >
              + Add New Customer
            </Button>
          </div>
        </div>
      </div>

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={(customer) => {
          setIsAddCustomerOpen(false);
          if (customer) {
            onSelect(customer);
          } else {
            // Shouldn't happen (AddCustomerModal always passes the customer
            // back now), but fail safe by just refreshing the list instead
            // of silently doing nothing.
            ledger.getCustomers().then((res) => setCustomers(res.customers)).catch(() => undefined);
          }
        }}
      />
    </>
  );
}
