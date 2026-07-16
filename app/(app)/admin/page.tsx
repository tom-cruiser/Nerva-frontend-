'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import RequireRole from '@/components/RequireRole';
import { 
  Plus, 
  ArrowUpRight, 
  Smartphone, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  ChevronRight,
  MonitorDot
} from 'lucide-react';

const RECENT_SALES = [
  { id: 'TXN-9021', cashier: 'Ama Owusu', total: 28600, items: 14, method: 'MOMO', status: 'PAID', time: '10 mins ago' },
  { id: 'TXN-9020', cashier: 'Kwame Asante', total: 18200, items: 9, method: 'CASH', status: 'PAID', time: '35 mins ago' },
  { id: 'TXN-9019', cashier: 'Kofi Boateng', total: 4200, items: 2, method: 'CREDIT', status: 'PENDING', time: '1 hr ago' },
  { id: 'TXN-9018', cashier: 'Ama Owusu', total: 12000, items: 6, method: 'CARD', status: 'PAID', time: '2 hrs ago' },
];

export default function TenantDashboard() {
  const { user, status } = useAuth();
  const router = useRouter();

  // Cashiers (STAFF role) operate registers only; bounce to POS.
  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'STAFF') {
      router.replace('/pos');
    }
  }, [user, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RequireRole allowedRoles={['OWNER', 'MANAGER', 'VIEWER']}>
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Console Dashboard</h1>
            <p className="text-[14px] text-zinc-500 mt-0.5">
              Workspace: <strong className="text-zinc-700">{user?.tenantId ? `Tenant ${user.tenantId.slice(0, 8)}…` : 'N/A'}</strong> · Role: <span className="text-[#0052ff] font-bold">{user?.role}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/pos')}
              className="bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.35)] flex items-center gap-2"
            >
              <Smartphone size={14} strokeWidth={2.5} />
              Open POS
            </button>
          </div>
        </div>

        {/* Metric widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* Main Stat Card - Corporate Blue Signature */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Gross Revenue</p>
              <p className="text-3xl font-extrabold text-[#0052ff] tracking-tight font-mono">XAF 1,245,600</p>
            </div>
            <div className="mt-2.5">
              <span className="text-[11px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-0.5 rounded-full border border-[#0052ff]/20 flex items-center gap-1 w-max">
                <ArrowUpRight size={10} strokeWidth={3} /> +18% vs yesterday
              </span>
            </div>
          </div>

          {/* Daily Transactions */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Daily Transactions</p>
              <p className="text-3xl font-extrabold text-[#0A0A0A] tracking-tight font-mono">48</p>
              <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-zinc-200/30">Completed sales</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-100/50 border border-zinc-200/40 flex items-center justify-center text-zinc-500">
              <Receipt size={18} />
            </div>
          </div>

          {/* Active Registers */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Active Registers</p>
              <p className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">3 / 4</p>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-flex items-center gap-1.5 border border-emerald-200/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MonitorDot size={18} />
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Low Stock Warnings</p>
              <p className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono">4</p>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full mt-2 inline-block border border-amber-200/30">Requires restock</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle size={18} />
            </div>
          </div>
        </div>

        {/* Content rows */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales Ledger */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                  <Receipt className="text-[#0052ff]" size={16} strokeWidth={2.5} />
                  Recent Transactions
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-1 rounded-full border border-[#0052ff]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0052ff] animate-pulse"></span>
                  LIVE SYNC
                </div>
              </div>

              <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                      <th className="py-4 px-4">Transaction</th>
                      <th className="py-4 px-4">Cashier</th>
                      <th className="py-4 px-4">Items</th>
                      <th className="py-4 px-4">Method</th>
                      <th className="py-4 px-4">Amount</th>
                      <th className="py-4 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                    {RECENT_SALES.map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#0052ff]/[0.02] transition-all cursor-default group">
                        <td className="py-4 px-4">
                          <p className="text-zinc-900 font-bold text-sm tracking-tight">{sale.id}</p>
                          <p className="text-[10px] text-zinc-400 font-mono font-semibold">{sale.time}</p>
                        </td>
                        <td className="py-4 px-4 text-zinc-600 font-semibold">{sale.cashier}</td>
                        <td className="py-4 px-4 font-mono text-zinc-500 font-semibold">{sale.items} items</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-500 rounded-md border border-zinc-200/40 uppercase tracking-wider">
                            {sale.method}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold font-mono text-[#0052ff] text-[13px]">
                          XAF {sale.total.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            sale.status === 'PAID' 
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/30' 
                              : 'bg-amber-50/80 text-amber-700 border-amber-200/30'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${sale.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2">
                <Activity className="text-[#0052ff]" size={14} strokeWidth={2.5} />
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/inventory')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[#0052ff] group-hover:bg-[#0052ff]/10 transition-colors">
                      <Plus size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">Inventory Catalog</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Configure prices, reorder alerts</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/ledgers')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-200/50 transition-colors">
                      <Receipt size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">Customer Ledgers</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Monitor credit debt journals</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => router.push('/whatsapp')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/60 text-left transition-all hover:scale-[1.01] shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-zinc-800">WhatsApp Digest</p>
                      <p className="text-[11px] text-zinc-400 font-medium">Configure automated summaries</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}