// components/ledgers/PaymentFormModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type PaymentType = 'PAYMENT' | 'CREDIT';
type PaymentMethod = 'CASH' | 'MOMO' | 'BANK_TRANSFER';

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    customerId: string;
    amount: number;
    type: PaymentType;
    method: PaymentMethod;
    note?: string;
  }) => Promise<void>;
  customers: Customer[];
  isSubmitting?: boolean;
}

export default function PaymentFormModal({
  isOpen,
  onClose,
  onSubmit,
  customers,
  isSubmitting = false,
}: PaymentFormModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<PaymentType>('PAYMENT');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const selectedCustomer = customers.find(c => c.id === customerId);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerId('');
      setAmount('');
      setType('PAYMENT');
      setMethod('CASH');
      setNote('');
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerId) {
      newErrors.customerId = 'Please select a customer';
    }

    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (type === 'PAYMENT' && selectedCustomer && amount > selectedCustomer.balance) {
      newErrors.amount = `Amount exceeds balance (XAF ${selectedCustomer.balance.toLocaleString()})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys({ customerId, amount, type, method }).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validate()) {
      return;
    }

    try {
      await onSubmit({
        customerId,
        amount: Number(amount),
        type,
        method,
        note: note || undefined,
      });
    } catch (error) {
      console.error('Failed to submit payment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Record Payment</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Add a payment or credit to a customer's ledger
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, customerId: true }))}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                errors.customerId && touched.customerId 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-zinc-200 focus:border-[#0052ff]'
              } bg-white text-zinc-800 text-sm font-medium transition-colors outline-none`}
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Balance: XAF {c.balance.toLocaleString()})
                </option>
              ))}
            </select>
            {errors.customerId && touched.customerId && (
              <p className="text-xs text-red-500 mt-1.5">{errors.customerId}</p>
            )}
          </div>

          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('PAYMENT')}
                  className={`flex-1 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    type === 'PAYMENT'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  💳 Payment
                </button>
                <button
                  type="button"
                  onClick={() => setType('CREDIT')}
                  className={`flex-1 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    type === 'CREDIT'
                      ? 'border-[#0052ff] bg-[#0052ff]/5 text-[#0052ff]'
                      : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  📝 Credit
                </button>
              </div>
            </div>

            {/* Payment Method (only for PAYMENT) */}
            {type === 'PAYMENT' && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                  Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium transition-colors outline-none focus:border-[#0052ff]"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="MOMO">📱 Mobile Money</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              Amount (XAF) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">XAF</span>
              <Input
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
                placeholder="Enter amount"
                className={`pl-16 ${
                  errors.amount && touched.amount ? 'border-red-300 focus:border-red-500' : ''
                }`}
              />
            </div>
            {errors.amount && touched.amount && (
              <p className="text-xs text-red-500 mt-1.5">{errors.amount}</p>
            )}
            {selectedCustomer && type === 'PAYMENT' && (
              <p className="text-xs text-zinc-400 mt-1.5">
                Current balance: XAF {selectedCustomer.balance.toLocaleString()}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium transition-colors outline-none focus:border-[#0052ff] resize-y"
              placeholder="Optional note about this transaction"
            />
          </div>

          {/* Summary */}
          {selectedCustomer && amount && type === 'PAYMENT' && (
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">New balance after payment:</span>
                <span className="font-bold text-emerald-600">
                  XAF {Math.max(0, selectedCustomer.balance - Number(amount)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-zinc-200 bg-white hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                type === 'PAYMENT' ? 'Record Payment' : 'Add Credit'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}