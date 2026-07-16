'use client';
import React, { useState, useEffect } from 'react';
import Card  from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const STAFF = [
  { id: 'S1', name: 'Ama Owusu',       role: 'Cashier', tag: 'STAFF:b12df9', sales: 14, revenue: 28600, status: 'active'   },
  { id: 'S2', name: 'Kwame Asante',    role: 'Cashier', tag: 'STAFF:a3f9b21c', sales: 9, revenue: 18200, status: 'active'  },
  { id: 'S3', name: 'Akosua Frimpong', role: 'Manager', tag: 'MANAGER:7ef12c',  sales: 21, revenue: 47000, status: 'active' },
  { id: 'S4', name: 'Kofi Boateng',    role: 'Cashier', tag: 'STAFF:c9d2e11a', sales: 2,  revenue: 4200,  status: 'break'  },
];

function Ticker({ start }: { start: Date }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [start]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return <span className="font-mono text-[#0052ff]">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}

const shiftStart = new Date(Date.now() - 6 * 3600_000 - 12 * 60_000);

export default function ShiftsPage() {
  return (
    <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Shifts</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">Current shift · started {shiftStart.toLocaleTimeString()}</p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200/50 text-[13px] font-bold uppercase tracking-wider hover:bg-red-100/50 transition-all">
          Close Shift
        </button>
      </div>

      {/* Live clock & Summary Card */}
      <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Shift Duration</p>
            <div className="text-[42px] font-black leading-none tracking-tight">
              <Ticker start={shiftStart} />
            </div>
            <p className="text-[13px] text-zinc-500 mt-2.5">
              Opened by <span className="text-zinc-800 font-semibold">Akosua Frimpong</span> (MANAGER)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8 text-center lg:text-right border-t lg:border-t-0 lg:border-l border-zinc-200/60 pt-6 lg:pt-0 lg:pl-12">
            {[
              { label: 'Total Sales',    value: '46',                     color: 'text-zinc-850' },
              { label: 'Revenue',        value: 'XAF 98,000',             color: 'text-[#0052ff] font-mono' },
              { label: 'Staff on Floor', value: String(STAFF.filter(s => s.status==='active').length), color: 'text-emerald-600' },
            ].map(m => (
              <div key={m.label} className="flex flex-col justify-center">
                <p className={`text-[24px] font-extrabold ${m.color} tracking-tight`}>{m.value}</p>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff performance table container */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
        <div className="px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
            {/* Users icon */}
            <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Staff Performance
          </h2>
          <div className="flex gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5"></span>
            LIVE TRACKING
          </div>
        </div>

        <div className="overflow-x-auto p-2">
          <table className="w-full text-[13px] text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                {['Staff Member','Role','Worker Tag','Sales','Revenue','Status'].map(h => (
                  <th key={h} className="py-4 px-4 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
              {STAFF.map(s => (
                <tr key={s.id} className="hover:bg-[#0052ff]/[0.02] transition-colors group cursor-default">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-black text-zinc-500 group-hover:bg-[#0052ff] group-hover:text-white transition-colors">
                        {s.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <span className="text-zinc-800 font-bold">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[11px] bg-zinc-100 text-zinc-500 font-semibold px-2.5 py-0.5 rounded-full">{s.role}</span>
                  </td>
                  <td className="py-4 px-4 font-mono text-zinc-400 font-semibold">{s.tag}</td>
                  <td className="py-4 px-4 text-zinc-805 font-bold">{s.sales}</td>
                  <td className="py-4 px-4 text-[#0052ff] font-bold font-mono text-[13px]">XAF {s.revenue.toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      s.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${s.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}