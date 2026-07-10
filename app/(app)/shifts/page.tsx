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
  return <span className="font-mono text-pulse">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}

const shiftStart = new Date(Date.now() - 6 * 3600_000 - 12 * 60_000);

export default function ShiftsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-ink tracking-tight">Shifts</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">Current shift · started {shiftStart.toLocaleTimeString()}</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[13px] font-semibold hover:bg-red-500/20 transition-colors">
          Close Shift
        </button>
      </div>

      {/* Live clock */}
      <Card dark padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Shift Duration</p>
            <div className="text-[42px] font-black leading-none tracking-tight">
              <Ticker start={shiftStart} />
            </div>
            <p className="text-[13px] text-zinc-500 mt-2">
              Opened by <span className="text-zinc-300">Akosua Frimpong</span> (MANAGER)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5 text-center">
            {[
              { label: 'Total Sales',    value: '46',               color: 'text-white'       },
              { label: 'Revenue',        value: 'XAF 98,000',       color: 'text-pulse'       },
              { label: 'Staff on Floor', value: String(STAFF.filter(s => s.status==='active').length), color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label}>
                <p className={`text-[24px] font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Staff performance table */}
      <Card dark padding="sm">
        <div className="flex items-center justify-between px-1 py-2 mb-3">
          <h2 className="text-[15px] font-semibold text-white">Staff Performance</h2>
          <Badge color="teal" dot>Live</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                {['Staff Member','Role','Worker Tag','Sales','Revenue','Status'].map(h => (
                  <th key={h} className="text-left font-medium pb-2.5 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {STAFF.map(s => (
                <tr key={s.id} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400">
                        {s.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <span className="text-zinc-200 font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{s.role}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-zinc-500 text-[11px]">{s.tag}</td>
                  <td className="py-3 pr-4 text-white font-semibold">{s.sales}</td>
                  <td className="py-3 pr-4 text-pulse font-bold font-mono">XAF {s.revenue.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <Badge color={s.status === 'active' ? 'green' : 'amber'} dot>
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
