// components/ledgers/CustomerDetailModal.tsx
'use client';
import React from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  lastActivity: string;
  trend: string;
}

interface Transaction {
  id: string;
  type: 'PAYMENT' | 'CREDIT';
  customer: string;
  amount: number;
  ref: string;
  date: string;
  balance: number;
}

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  onRecordPayment: () => void;
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  transactions,
  onRecordPayment,
}: CustomerDetailModalProps) {
  if (!isOpen || !customer) return null;

  const totalPaid = transactions
    .filter(t => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredit = transactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0052ff] text-white flex items-center justify-center font-bold text-sm">
                {customer.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{customer.name}</h2>
                <p className="text-sm text-zinc-500">{customer.phone}</p>
              </div>
            </div>
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

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-50 rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Balance</p>
              <p className={`text-lg font-bold ${customer.balance === 0 ? 'text-emerald-600' : 'text-[#0052ff]'}`}>
                XAF {customer.balance.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Paid</p>
              <p className="text-lg font-bold text-emerald-600">
                XAF {totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Credit</p>
              <p className="text-lg font-bold text-[#0052ff]">
                XAF {totalCredit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-zinc-700">Recent Transactions</h3>
              <Button 
                size="sm" 
                onClick={onRecordPayment}
                className="bg-[#0052ff] hover:bg-[#003bbf] text-white"
              >
                Record Payment
              </Button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-sm">
                No transactions found for this customer
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        t.type === 'CREDIT' ? 'bg-[#0052ff]' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-zinc-800">{t.type}</p>
                        <p className="text-xs text-zinc-400">{t.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        t.type === 'CREDIT' ? 'text-[#0052ff]' : 'text-emerald-600'
                      }`}>
                        {t.type === 'CREDIT' ? '+' : '−'} XAF {t.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-400">Balance: XAF {t.balance.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}