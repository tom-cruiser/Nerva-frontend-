'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ledger } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import PaymentFormModal from '@/components/ledgers/PaymentFormModal';
import CustomerDetailModal from '@/components/ledgers/CustomerDetailModal';

type PaymentType = 'PAYMENT' | 'CREDIT';
type PaymentMethod = 'CASH' | 'MOMO' | 'BANK_TRANSFER';

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  lastActivity: string;
  trend: 'up' | 'down' | 'flat';
  email?: string;
  totalPaid?: number;
  totalCredit?: number;
}

interface Transaction {
  id: string;
  type: 'PAYMENT' | 'CREDIT';
  customer: string;
  customerId: string;
  amount: number;
  ref: string;
  date: string;
  balance: number;
  method?: 'CASH' | 'MOMO' | 'BANK_TRANSFER';
  note?: string;
}

interface LedgerSummary {
  totalOutstanding: number;
  activeDebtors: number;
  paidThisMonth: number;
  paymentsReceived: number;
  overdue: number;
  overdueCustomers: number;
}

export default function LedgersPage() {
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load all data from API
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [customersData, transactionsData, summaryData] = await Promise.all([
        ledger.getCustomers(),
        ledger.getTransactions({ limit: 100 }),
        ledger.getSummary(),
      ]);

      setCustomers(customersData.customers);
      setTransactions(transactionsData.transactions);
      setSummary(summaryData);
      
      // Update last activity timestamps
      if (customersData.customers.length > 0) {
        const updatedCustomers = customersData.customers.map(c => ({
          ...c,
          lastActivity: formatLastActivity(c.lastActivity),
        }));
        setCustomers(updatedCustomers);
      }
      
    } catch (err) {
      console.error('Failed to load ledger data:', err);
      if (err instanceof ApiError) {
        if (err.isNotImplemented) {
          setError('Ledger API is not yet implemented on the backend. Showing sample data.');
          // Load sample data as fallback
          loadSampleData();
        } else {
          setError(`Failed to load ledger data: ${err.message}`);
        }
      } else {
        setError('Failed to load ledger data. Please check your connection.');
        // Load sample data as fallback
        loadSampleData();
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  // Load sample data as fallback
  const loadSampleData = () => {
    const sampleCustomers: Customer[] = [
      { id: 'C001', name: 'Abena Mensah', phone: '+233241234567', balance: 24500, lastActivity: '1 hr ago', trend: 'up' },
      { id: 'C002', name: 'Kwame Asante', phone: '+233200987654', balance: 8200, lastActivity: '3 hrs ago', trend: 'down' },
      { id: 'C003', name: 'Ama Owusu', phone: '+233557891234', balance: 0, lastActivity: 'Yesterday', trend: 'flat' },
      { id: 'C004', name: 'Kofi Boateng', phone: '+233244556677', balance: 51000, lastActivity: '2 days ago', trend: 'up' },
      { id: 'C005', name: 'Akosua Frimpong', phone: '+233201122334', balance: 12800, lastActivity: '4 hrs ago', trend: 'up' },
    ];
    
    const sampleTransactions: Transaction[] = [
      { id: 'E001', type: 'CREDIT', customer: 'Abena Mensah', customerId: 'C001', amount: 15000, ref: 'TXN-0091', date: 'Today 09:42', balance: 24500 },
      { id: 'E002', type: 'PAYMENT', customer: 'Kwame Asante', customerId: 'C002', amount: 5000, ref: 'PAY-0034', date: 'Today 08:10', balance: 8200 },
      { id: 'E003', type: 'CREDIT', customer: 'Kofi Boateng', customerId: 'C004', amount: 30000, ref: 'TXN-0088', date: 'Yesterday', balance: 51000 },
      { id: 'E004', type: 'PAYMENT', customer: 'Ama Owusu', customerId: 'C003', amount: 12000, ref: 'PAY-0033', date: 'Yesterday', balance: 0 },
      { id: 'E005', type: 'CREDIT', customer: 'Akosua Frimpong', customerId: 'C005', amount: 12800, ref: 'TXN-0085', date: '2 days ago', balance: 12800 },
    ];
    
    setCustomers(sampleCustomers);
    setTransactions(sampleTransactions);
    setSummary({
      totalOutstanding: sampleCustomers.reduce((sum, c) => sum + c.balance, 0),
      activeDebtors: sampleCustomers.filter(c => c.balance > 0).length,
      paidThisMonth: 34200,
      paymentsReceived: 7,
      overdue: 8200,
      overdueCustomers: 2,
    });
  };

  // Format last activity time
  const formatLastActivity = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalDebt = customers.reduce((s, c) => s + c.balance, 0);
  const debtors = customers.filter(c => c.balance > 0).length;

  const activeCustomer = customers.find(c => c.id === activeCustomerId);
  const filteredEntries = transactions.filter(
    e => !activeCustomerId || e.customerId === activeCustomerId
  );

  const handlePaymentSubmit = async (data: {
    customerId: string;
    amount: number;
    type: PaymentType;
    method: PaymentMethod;
    note?: string;
  }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      let result;
      if (data.type === 'PAYMENT') {
        result = await ledger.recordPayment(
          data.customerId,
          data.amount,
          data.method,
          data.note
        );
      } else {
        result = await ledger.recordCredit(
          data.customerId,
          data.amount,
          data.note
        );
      }
      
      console.log('Payment recorded successfully:', result);
      
      // Reload data to reflect changes
      await loadData();
      
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to record payment:', err);
      if (err instanceof ApiError) {
        setError(`Failed to record payment: ${err.message}`);
      } else {
        setError('Failed to record payment. Please try again.');
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDetailOpen(true);
  };

  // Refresh data
  const handleRefresh = () => {
    loadData();
  };

  // Render loading state
  if (isLoading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0052ff] border-t-transparent mx-auto"></div>
          <p className="text-zinc-500 font-medium">Loading ledger data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Ledgers</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">
            Digital debt book · <span className="text-[#0052ff] font-bold">{debtors} active debtors</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mr-2"></span>
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-[#0052ff] hover:bg-[#0041cc] text-white font-bold disabled:opacity-50"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Record Payment
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`rounded-xl p-4 ${
          error.includes('not yet implemented') 
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl">{error.includes('not yet implemented') ? '⚠️' : '❌'}</span>
            <div>
              <p className="font-bold">{error.includes('not yet implemented') ? 'Notice' : 'Error'}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary strips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Outstanding Debt */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Total Outstanding</p>
            <p className="text-3xl font-extrabold text-[#0052ff] tracking-tight font-mono">
              XAF {totalDebt.toLocaleString()}
            </p>
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-0.5 rounded-full border border-[#0052ff]/20">
              Across {debtors} customers
            </span>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Paid This Month</p>
            <p className="text-3xl font-extrabold text-[#0A0A0A] tracking-tight font-mono">
              XAF {(summary?.paidThisMonth ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200/30">
              {summary?.paymentsReceived ?? 0} payments received
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Overdue (&gt;30 days)</p>
            <p className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono">
              XAF {(summary?.overdue ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/30">
              {summary?.overdueCustomers ?? 0} customers flagging
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Customer list */}
        <div className="xl:col-span-1">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2.5">
              <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Customers
              {isLoading && (
                <span className="inline-block w-3 h-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin ml-2"></span>
              )}
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  No customers found
                </div>
              ) : (
                customers.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => {
                      setActiveCustomerId(activeCustomerId === c.id ? null : c.id);
                      handleViewCustomer(c);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border
                      ${activeCustomerId === c.id 
                        ? 'bg-[#0052ff]/[0.04] border-[#0052ff]/30 shadow-sm' 
                        : 'border-transparent bg-zinc-50/40 hover:bg-zinc-50/90 hover:scale-[1.01]'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-colors
                      ${activeCustomerId === c.id ? 'bg-[#0052ff] text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      {c.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-zinc-850 truncate">{c.name}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">{c.phone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[13px] font-bold font-mono ${c.balance === 0 ? 'text-emerald-600' : 'text-[#0052ff]'}`}>
                        {c.balance === 0 ? 'Clear' : `XAF ${c.balance.toLocaleString()}`}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">{c.lastActivity}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ledger entries */}
        <div className="xl:col-span-2">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                {activeCustomer ? `${activeCustomer.name} — History` : 'All Journal Entries'}
                <span className="text-xs text-zinc-400 font-normal">
                  ({filteredEntries.length} entries)
                </span>
              </h2>
              <div className="flex gap-1.5 text-[10px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-1 rounded-full border border-[#0052ff]/20">
                <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'animate-pulse bg-zinc-400' : 'bg-[#0052ff]'}`}></span>
                {isLoading ? 'LOADING...' : 'SYNCED'}
              </div>
            </div>

            <div className="overflow-x-auto p-2 max-h-[500px] overflow-y-auto">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead className="sticky top-0 bg-white/90">
                  <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {['Type','Customer','Amount','Reference','Balance After','Date'].map(h => (
                      <th key={h} className="py-4 px-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                  {isLoading && filteredEntries.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="py-4 px-4">
                          <div className="h-4 bg-zinc-100 rounded animate-pulse"></div>
                        </td>
                      </tr>
                    ))
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        {activeCustomer ? 'No transactions found for this customer' : 'No transactions found'}
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-[#0052ff]/[0.02] transition-colors group cursor-default">
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            e.type === 'CREDIT' 
                              ? 'bg-[#0052ff]/5 text-[#0052ff] border-[#0052ff]/10' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${e.type === 'CREDIT' ? 'bg-[#0052ff]' : 'bg-emerald-500'}`}></span>
                            {e.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-zinc-800 font-bold">{e.customer}</td>
                        <td className={`py-4 px-4 font-bold font-mono text-[13px] ${e.type === 'CREDIT' ? 'text-[#0052ff]' : 'text-emerald-600'}`}>
                          {e.type === 'CREDIT' ? '+' : '−'} XAF {e.amount.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-mono text-zinc-400 font-semibold">{e.ref}</td>
                        <td className="py-4 px-4 text-zinc-500 font-mono">
                          XAF {e.balance.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-zinc-400 font-semibold">{e.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handlePaymentSubmit}
        customers={customers}
        isSubmitting={isSubmitting}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={isCustomerDetailOpen}
        onClose={() => {
          setIsCustomerDetailOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        transactions={transactions.filter(t => t.customerId === selectedCustomer?.id)}
        onRecordPayment={() => {
          setIsCustomerDetailOpen(false);
          setIsPaymentModalOpen(true);
        }}
      />
    </div>
  );
}