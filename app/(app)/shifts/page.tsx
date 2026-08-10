'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import RequireRole from '@/components/RequireRole';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { shifts } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type {
  CurrentShift,
  NoOpenShift,
  StaffPerformanceEntry,
  ShiftHistoryEntry,
  CloseShiftResponse,
} from '@/lib/types';

function isOpenShift(s: CurrentShift | NoOpenShift | null): s is CurrentShift {
  return !!s && s.status !== 'NO_OPEN_SHIFT';
}

/** Live HH:MM:SS ticker since `start`. */
function Ticker({ start }: { start: Date }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [start]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return <span className="font-mono text-[#0052ff]">{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

function Banner({ tone, children }: { tone: 'error' | 'warn' | 'success'; children: React.ReactNode }) {
  const cls =
    tone === 'error' ? 'bg-red-50 border-red-200/80 text-red-700'
    : tone === 'warn' ? 'bg-amber-50 border-amber-200/80 text-amber-800'
    : 'bg-emerald-50 border-emerald-200/80 text-emerald-700';
  return <div className={`text-[13px] rounded-xl border px-4 py-3.5 font-semibold shadow-sm ${cls}`}>{children}</div>;
}

export default function ShiftsPage() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission('shifts:manage');

  const [shift, setShift] = useState<CurrentShift | NoOpenShift | null>(null);
  const [staff, setStaff] = useState<StaffPerformanceEntry[]>([]);
  const [history, setHistory] = useState<ShiftHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeResult, setCloseResult] = useState<CloseShiftResponse | null>(null);

  const loadAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    setError(null);
    try {
      const [shiftRes, historyRes] = await Promise.all([
        shifts.getCurrent(),
        shifts.getHistory(10).catch(() => ({ shifts: [] as ShiftHistoryEntry[] })),
      ]);
      setShift(shiftRes);
      setHistory(historyRes.shifts ?? []);

      if (isOpenShift(shiftRes)) {
        const perf = await shifts.getStaffPerformance().catch(() => ({ staff: [] as StaffPerformanceEntry[] }));
        setStaff(perf.staff ?? []);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error('Failed to load shift data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load shift data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const open = isOpenShift(shift) ? shift : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-64px)] bg-zinc-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0052ff] border-t-transparent mx-auto" />
          <p className="text-zinc-500 font-medium">Loading shift status...</p>
        </div>
      </div>
    );
  }

  return (
    <RequireRole requiredPermission="shifts:read">
      <div className="p-4 sm:p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100dvh-64px)] overflow-y-auto">

        {error && <Banner tone="error">{error}</Banner>}

        {closeResult && (
          <Banner tone={closeResult.status === 'ANOMALY' ? 'warn' : 'success'}>
            <div className="flex items-start justify-between gap-3">
              <span>
                Shift closed as <strong>{closeResult.status}</strong> — expected XAF {closeResult.expected_cash.toLocaleString()},
                {' '}reported XAF {closeResult.reported_cash.toLocaleString()}
                {closeResult.discrepancy !== 0 && (
                  <> ({closeResult.discrepancy > 0 ? 'over' : 'short'} by XAF {Math.abs(closeResult.discrepancy).toLocaleString()})</>
                )}.
              </span>
              <button onClick={() => setCloseResult(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">✕</button>
            </div>
          </Banner>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-black text-[#0A0A0A] tracking-tight">Shifts</h1>
            <p className="text-[13px] sm:text-[14px] text-zinc-500 mt-0.5">
              {open ? `Current shift · started ${new Date(open.opened_at).toLocaleTimeString()}` : 'No shift is currently open'}
            </p>
          </div>
          {canManage && (
            open ? (
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200/50 text-[13px] font-bold uppercase tracking-wider hover:bg-red-100/50 transition-all"
              >
                Close Shift
              </button>
            ) : (
              <button
                onClick={() => setIsOpenModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#0052ff] text-white border border-[#0052ff] text-[13px] font-bold uppercase tracking-wider hover:bg-[#003bbf] transition-all shadow-md shadow-[#0052ff]/10"
              >
                Open Shift
              </button>
            )
          )}
        </div>

        {open ? (
          <>
            {/* Live clock & Summary Card */}
            <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">Shift Duration</p>
                  <div className="text-[36px] sm:text-[42px] font-black leading-none tracking-tight">
                    <Ticker start={new Date(open.opened_at)} />
                  </div>
                  <p className="text-[13px] text-zinc-500 mt-2.5">
                    Opened by <span className="text-zinc-800 font-semibold">{open.worker_tag}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8 text-center lg:text-right border-t lg:border-t-0 lg:border-l border-zinc-200/60 pt-6 lg:pt-0 lg:pl-12">
                  {[
                    { label: 'Total Sales', value: String(open.sales_count), color: 'text-zinc-850' },
                    { label: 'Revenue', value: `XAF ${open.all_sales_total.toLocaleString()}`, color: 'text-[#0052ff] font-mono' },
                    { label: 'Cash Expected', value: `XAF ${(open.opening_balance + open.cash_sales_total).toLocaleString()}`, color: 'text-emerald-600 font-mono' },
                    { label: 'Sold This Shift', value: String(staff.filter(s => s.sales_count > 0).length), color: 'text-zinc-850' },
                  ].map(m => (
                    <div key={m.label} className="flex flex-col justify-center">
                      <p className={`text-xl sm:text-[24px] font-extrabold ${m.color} tracking-tight`}>{m.value}</p>
                      <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Staff performance table */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
              <div className="px-4 sm:px-6 py-4 border-b border-zinc-200/40 flex justify-between items-center bg-white/40">
                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2.5">
                  <svg className="text-[#0052ff] w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Staff Performance
                </h2>
                <div className="flex gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
                  LIVE TRACKING
                </div>
              </div>

              <div className="overflow-x-auto p-2">
                <table className="w-full text-[13px] text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                      {['Staff Member', 'Role', 'Worker Tag', 'Sales', 'Revenue', 'Status'].map(h => (
                        <th key={h} className="py-4 px-4 font-bold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-400 text-sm">
                          No staff activity recorded for this shift yet.
                        </td>
                      </tr>
                    ) : (
                      staff.map(s => (
                        <tr key={s.id} className="hover:bg-[#0052ff]/[0.02] transition-colors group cursor-default">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-black text-zinc-500 group-hover:bg-[#0052ff] group-hover:text-white transition-colors shrink-0">
                                {(s.full_name || s.worker_tag).split(/[\s:]/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
                              </div>
                              <span className="text-zinc-800 font-bold whitespace-nowrap">{s.full_name || '(no name set)'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-[11px] bg-zinc-100 text-zinc-500 font-semibold px-2.5 py-0.5 rounded-full">{s.role}</span>
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-400 font-semibold whitespace-nowrap">{s.worker_tag}</td>
                          <td className="py-4 px-4 text-zinc-805 font-bold">{s.sales_count}</td>
                          <td className="py-4 px-4 text-[#0052ff] font-bold font-mono text-[13px] whitespace-nowrap">XAF {s.revenue.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                              s.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${s.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                              {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-10 sm:p-14 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-800">No shift is currently open</h2>
            <p className="text-sm text-zinc-500 mt-1.5 max-w-sm mx-auto">
              {canManage
                ? 'Open a shift to start tracking sales and reconcile the cash drawer at the end of the day.'
                : 'Ask a cashier or manager to open the till before ringing up sales.'}
            </p>
            {canManage && (
              <Button className="mt-6" onClick={() => setIsOpenModalOpen(true)}>
                Open Shift
              </Button>
            )}
          </div>
        )}

        {/* Recent shift history */}
        {history.length > 0 && (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
            <div className="px-4 sm:px-6 py-4 border-b border-zinc-200/40 bg-white/40">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600">Recent Shifts</h2>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/60 border-b border-zinc-200/30 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {['Opened', 'Closed', 'Opened By', 'Expected', 'Reported', 'Discrepancy', 'Status'].map(h => (
                      <th key={h} className="py-3.5 px-4 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/60 text-xs font-medium text-zinc-700">
                  {history.map(h => (
                    <tr key={h.shift_id} className="hover:bg-[#0052ff]/[0.02] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">{new Date(h.opened_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{new Date(h.closed_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500 whitespace-nowrap">{h.worker_tag}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{h.expected_cash !== null ? `XAF ${h.expected_cash.toLocaleString()}` : '—'}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{h.reported_cash !== null ? `XAF ${h.reported_cash.toLocaleString()}` : '—'}</td>
                      <td className={`py-3.5 px-4 font-mono whitespace-nowrap ${
                        h.discrepancy === null ? '' : h.discrepancy === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {h.discrepancy !== null ? `${h.discrepancy > 0 ? '+' : ''}XAF ${h.discrepancy.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                          h.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : h.status === 'ANOMALY' ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <OpenShiftModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        onOpened={() => { setIsOpenModalOpen(false); loadAll(); }}
      />
      <CloseShiftModal
        isOpen={isCloseModalOpen}
        shift={open}
        onClose={() => setIsCloseModalOpen(false)}
        onClosed={(result) => { setIsCloseModalOpen(false); setCloseResult(result); loadAll(); }}
      />
    </RequireRole>
  );
}

// ─── Open Shift Modal ───────────────────────────────────────────────────────

function OpenShiftModal({
  isOpen,
  onClose,
  onOpened,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpened: () => void;
}) {
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOpeningBalance('0');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsed = Number(openingBalance);
  const isValid = openingBalance.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await shifts.open(parsed);
      onOpened();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to open shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200/60 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Open Shift</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-zinc-500">
            Count the cash currently in the drawer and enter it as the opening float. This is the baseline used to reconcile cash at close.
          </p>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Opening Balance (XAF)</label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="text-base font-mono"
              autoFocus
            />
          </div>
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200/60 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            className="bg-[#0052ff] hover:bg-[#003bbf] text-white"
            loading={isSubmitting}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            Open Shift
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Shift Modal ──────────────────────────────────────────────────────

function CloseShiftModal({
  isOpen,
  shift,
  onClose,
  onClosed,
}: {
  isOpen: boolean;
  shift: CurrentShift | null;
  onClose: () => void;
  onClosed: (result: CloseShiftResponse) => void;
}) {
  const [reportedCash, setReportedCash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReportedCash('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !shift) return null;

  const expected = shift.opening_balance + shift.cash_sales_total;
  const parsed = Number(reportedCash);
  const isValid = reportedCash.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await shifts.close(shift.shift_id, parsed);
      onClosed(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to close shift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200/60 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900">Close Shift</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Opening float</span>
              <span className="font-mono text-zinc-700">XAF {shift.opening_balance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Cash sales this shift</span>
              <span className="font-mono text-zinc-700">XAF {shift.cash_sales_total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-zinc-900 font-bold pt-1.5 border-t border-zinc-200/60">
              <span>Expected in drawer</span>
              <span className="font-mono text-[#0052ff]">XAF {expected.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Count the physical cash in the drawer now and enter the total below.
          </p>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Counted Cash (XAF)</label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={reportedCash}
              onChange={(e) => setReportedCash(e.target.value)}
              className="text-base font-mono"
              autoFocus
            />
          </div>
          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200/60 flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="danger"
            loading={isSubmitting}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            Close Shift
          </Button>
        </div>
      </div>
    </div>
  );
}
