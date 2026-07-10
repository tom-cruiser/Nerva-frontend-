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
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-ink tracking-tight">Ledgers</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">Digital debt book · {debtors} active debtors</p>
        </div>
        <Button size="sm">Record Payment</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-panel border border-zinc-800 rounded-xl2 p-5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Total Outstanding</p>
          <p className="text-[28px] font-bold text-pulse mt-1">XAF {totalDebt.toLocaleString()}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">across {debtors} customers</p>
        </div>
        <div className="bg-panel border border-zinc-800 rounded-xl2 p-5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Paid This Month</p>
          <p className="text-[28px] font-bold text-emerald-400 mt-1">XAF 34,200</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">7 payments received</p>
        </div>
        <div className="bg-panel border border-zinc-800 rounded-xl2 p-5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Overdue (&gt;30 days)</p>
          <p className="text-[28px] font-bold text-amber-400 mt-1">XAF 8,200</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">2 customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Customer list */}
        <div className="xl:col-span-1">
          <Card dark padding="sm">
            <h2 className="text-[15px] font-semibold text-white px-1 py-2 mb-2">Customers</h2>
            <div className="space-y-1">
              {CUSTOMERS.map(c => (
                <button key={c.id} onClick={() => setActive(active === c.id ? null : c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors
                    ${active === c.id ? 'bg-pulse/10 border border-pulse/25' : 'border border-transparent hover:bg-white/4'}`}>
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-[12px] font-bold text-zinc-400 flex-shrink-0">
                    {c.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-200 truncate">{c.name}</p>
                    <p className="text-[11px] text-zinc-500">{c.phone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[13px] font-bold ${c.balance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {c.balance === 0 ? 'Clear' : `XAF ${c.balance.toLocaleString()}`}
                    </p>
                    <p className="text-[10px] text-zinc-600">{c.lastActivity}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Ledger entries */}
        <div className="xl:col-span-2">
          <Card dark padding="sm">
            <div className="flex items-center justify-between px-1 py-2 mb-3">
              <h2 className="text-[15px] font-semibold text-white">
                {active ? `${CUSTOMERS.find(c => c.id === active)?.name} — History` : 'All Entries'}
              </h2>
              <div className="flex gap-2">
                <Badge color="teal"  dot>Credits</Badge>
                <Badge color="green" dot>Payments</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    {['Type','Customer','Amount','Reference','Balance After','Date'].map(h => (
                      <th key={h} className="text-left font-medium pb-2.5 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {ENTRIES
                    .filter(e => !active || e.customer === CUSTOMERS.find(c => c.id === active)?.name)
                    .map((e, i) => (
                      <tr key={i} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 pr-4">
                          <Badge color={e.type === 'CREDIT' ? 'amber' : 'green'} dot>{e.type}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-zinc-200 font-medium">{e.customer}</td>
                        <td className={`py-3 pr-4 font-bold font-mono ${e.type === 'CREDIT' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {e.type === 'CREDIT' ? '+' : '−'} XAF {e.amount.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 font-mono text-zinc-500 text-[11px]">{e.ref}</td>
                        <td className="py-3 pr-4 text-zinc-400 font-mono text-[12px]">
                          XAF {e.balance.toLocaleString()}
                        </td>
                        <td className="py-3 text-zinc-500 text-[11px]">{e.date}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
