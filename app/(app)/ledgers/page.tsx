'use client';
import React, { useState } from 'react';
import Card   from '@/components/ui/Card';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const CUSTOMERS = [
  { id: 'C001', name: 'Abena Mensah',    phone: '+233241234567', balance: 24500, lastActivity: '1 hr ago',  trend: 'up'   },
  { id: 'C002', name: 'Kwame Asante',    phone: '+233200987654', balance: 8200,  lastActivity: '3 hrs ago', trend: 'down' },
  { id: 'C003', name: 'Ama Owusu',       phone: '+233557891234', balance: 0,     lastActivity: 'Yesterday', trend: 'flat' },
  { id: 'C004', name: 'Kofi Boateng',    phone: '+233244556677', balance: 51000, lastActivity: '2 days ago',trend: 'up'   },
  { id: 'C005', name: 'Akosua Frimpong', phone: '+233201122334', balance: 12800, lastActivity: '4 hrs ago', trend: 'up'   },
];

const ENTRIES = [
  { type: 'CREDIT',  customer: 'Abena Mensah',  amount: 15000, ref: 'TXN-0091', date: 'Today 09:42',   balance: 24500 },
  { type: 'PAYMENT', customer: 'Kwame Asante',   amount: 5000,  ref: 'PAY-0034', date: 'Today 08:10',   balance: 8200  },
  { type: 'CREDIT',  customer: 'Kofi Boateng',   amount: 30000, ref: 'TXN-0088', date: 'Yesterday',     balance: 51000 },
  { type: 'PAYMENT', customer: 'Ama Owusu',      amount: 12000, ref: 'PAY-0033', date: 'Yesterday',     balance: 0     },
  { type: 'CREDIT',  customer: 'Akosua Frimpong',amount: 12800, ref: 'TXN-0085', date: '2 days ago',    balance: 12800 },
];

export default function LedgersPage() {
  const [active, setActive] = useState<string | null>(null);

  const totalDebt = CUSTOMERS.reduce((s, c) => s + c.balance, 0);
  const debtors   = CUSTOMERS.filter(c => c.balance > 0).length;

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
        <button className="bg-[#0052ff] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#0041cc] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,82,255,0.35)] flex items-center gap-2">
          {/* Plus icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Record Payment
        </button>
      </div>

      {/* Summary strips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Outstanding Debt - Signature Corporate Blue */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Total Outstanding</p>
            <p className="text-3xl font-extrabold text-[#0052ff] tracking-tight font-mono">XAF {totalDebt.toLocaleString()}</p>
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
            <p className="text-3xl font-extrabold text-[#0A0A0A] tracking-tight font-mono">XAF 34,200</p>
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200/30">
              7 payments received
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Overdue (&gt;30 days)</p>
            <p className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono">XAF 8,200</p>
          </div>
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/30">
              2 customers flagging
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Customer list */}
        <div className="xl:col-span-1">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4 flex items-center gap-2.5">
              {/* Users icon */}
              <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Customers
            </h2>
            <div className="space-y-2">
              {CUSTOMERS.map(c => (
                <button key={c.id} onClick={() => setActive(active === c.id ? null : c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border
                    ${active === c.id 
                      ? 'bg-[#0052ff]/[0.04] border-[#0052ff]/30 shadow-sm' 
                      : 'border-transparent bg-zinc-50/40 hover:bg-zinc-50/90 hover:scale-[1.01]'}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-colors
                    ${active === c.id ? 'bg-[#0052ff] text-white' : 'bg-zinc-100 text-zinc-500'}`}>
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
              ))}
            </div>
          </div>
        </div>

        {/* Ledger entries */}
        <div className="xl:col-span-2">
          <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                {/* Ledger / file-text icon */}
                <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                {active ? `${CUSTOMERS.find(c => c.id === active)?.name} — History` : 'All Journal Entries'}
              </h2>
              <div className="flex gap-1.5 text-[10px] font-bold text-[#0052ff] bg-[#0052ff]/10 px-2.5 py-1 rounded-full border border-[#0052ff]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0052ff] animate-pulse"></span>
                SYNCED
              </div>
            </div>

            <div className="overflow-x-auto p-2">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {['Type','Customer','Amount','Reference','Balance After','Date'].map(h => (
                      <th key={h} className="py-4 px-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                  {ENTRIES
                    .filter(e => !active || e.customer === CUSTOMERS.find(c => c.id === active)?.name)
                    .map((e, i) => (
                      <tr key={i} className="hover:bg-[#0052ff]/[0.02] transition-colors group cursor-default">
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
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}