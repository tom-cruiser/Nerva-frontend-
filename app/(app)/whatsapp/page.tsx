'use client';
import React, { useState } from 'react';
import Card   from '@/components/ui/Card';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const LOGS = [
  { id: 'N001', recipient: '+233241234567', name: 'Abena Mensah',  template: 'daily_report',   status: 'DELIVERED', sent: '8:02 PM', retry: 0  },
  { id: 'N002', recipient: '+233200987654', name: 'Kwame Asante',  template: 'debt_reminder',   status: 'DELIVERED', sent: '8:02 PM', retry: 0  },
  { id: 'N003', recipient: '+233557891234', name: 'Ama Owusu',     template: 'daily_report',   status: 'FAILED',    sent: '8:02 PM', retry: 2  },
  { id: 'N004', recipient: '+233244556677', name: 'Kofi Boateng',  template: 'debt_reminder',   status: 'SENT',      sent: '8:03 PM', retry: 0  },
  { id: 'N005', recipient: '+233201122334', name: 'Akosua Frimpong',template: 'promo_blast',   status: 'DELIVERED', sent: '8:04 PM', retry: 0  },
];

const STATUS_COLOR = { DELIVERED: 'green' as const, SENT: 'teal' as const, FAILED: 'red' as const, QUEUED: 'zinc' as const };

export default function WhatsappPage() {
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => setSending(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-ink tracking-tight">WhatsApp</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">Twilio Business API · 28 messages today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Configure Templates</Button>
          <Button size="sm" loading={sending} onClick={handleSend}>
            Send Report Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Sent Today',   value: '28', sub: 'since midnight',   color: 'text-white'       },
          { label: 'Delivered',    value: '26', sub: '92.8% delivery',   color: 'text-emerald-400' },
          { label: 'Failed',       value: '2',  sub: 'will retry ×3',    color: 'text-red-400'     },
          { label: 'Next Cron',    value: '8PM',sub: 'daily digest',     color: 'text-pulse'       },
        ].map(s => (
          <div key={s.label} className="bg-panel border border-zinc-800 rounded-xl2 p-4">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className={`text-[26px] font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Notification log */}
        <div className="xl:col-span-2">
          <Card dark padding="sm">
            <div className="flex items-center justify-between px-1 py-2 mb-3">
              <h2 className="text-[15px] font-semibold text-white">Message Log</h2>
              <Badge color="teal" dot>Live</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    {['Recipient','Template','Status','Sent','Retries',''].map(h => (
                      <th key={h} className="text-left font-medium pb-2.5 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {LOGS.map(l => (
                    <tr key={l.id} className="hover:bg-white/2 transition-colors group">
                      <td className="py-3 pr-4">
                        <p className="text-zinc-200 font-medium">{l.name}</p>
                        <p className="text-[11px] font-mono text-zinc-500">{l.recipient}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">{l.template}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge color={STATUS_COLOR[l.status as keyof typeof STATUS_COLOR] ?? 'zinc'} dot>{l.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-zinc-500 text-[11px]">{l.sent}</td>
                      <td className="py-3 pr-4">
                        {l.retry > 0
                          ? <span className="text-red-400 font-mono text-[12px]">×{l.retry}</span>
                          : <span className="text-zinc-700">—</span>
                        }
                      </td>
                      <td className="py-3">
                        {l.status === 'FAILED' && (
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-md text-[11px] bg-pulse/10 text-pulse hover:bg-pulse/20">
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Scheduled crons */}
        <div>
          <Card dark padding="md">
            <h2 className="text-[15px] font-semibold text-white mb-4">Scheduled Crons</h2>
            <div className="space-y-3">
              {[
                { name: 'Daily Digest',    cron: '0 20 * * *', next: 'Today 8:00 PM',   active: true  },
                { name: 'Debt Reminders',  cron: '0 9 * * 1',  next: 'Monday 9:00 AM',  active: true  },
                { name: 'Low Stock Alert', cron: '0 8 * * *',  next: 'Tomorrow 8:00 AM', active: false },
              ].map(job => (
                <div key={job.name} className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-zinc-200">{job.name}</span>
                    <div className={`w-2 h-2 rounded-full ${job.active ? 'bg-emerald-400 pulse-dot' : 'bg-zinc-600'}`} />
                  </div>
                  <p className="font-mono text-[11px] text-zinc-500">{job.cron}</p>
                  <p className="text-[11px] text-zinc-500">
                    Next: <span className="text-zinc-300">{job.next}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
