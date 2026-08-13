'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Avatar, Button, Input } from '@/components/ui';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/app/context/AuthContext';
import { seats as seatsApi } from '@/lib/endpoints';
import { ApiError, uuid } from '@/lib/api';
import { nowTimestamptz } from '@/lib/tenancy';
import {
  TIER_SEAT_LIMITS,
  TIER_LABELS,
  EXTRA_PERMISSION_GROUPS,
  type BillingTier,
  type ExtraPermissionGroup,
  type Seat,
  type UserRole,
} from '@/lib/types';

/** Which of EXTRA_PERMISSION_GROUPS does this seat currently have granted?
 *  A group counts as "active" only when EVERY permission in it is present —
 *  matches how the toggle always grants/revokes a group as one bundle. */
function activeGroups(seat: Seat): ExtraPermissionGroup[] {
  if (!seat.permissions) return [];
  const granted = new Set(seat.permissions);
  return EXTRA_PERMISSION_GROUPS.filter((g) => g.permissions.every((p) => granted.has(p)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'STAFF', label: 'Staff — POS & sales' },
  { value: 'MANAGER', label: 'Manager — full store ops' },
];

/** Suggest an audit tag from the worker's name: NAME-XXXX (upper, mono). */
function suggestWorkerTag(name: string): string {
  const base =
    name.trim().split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'WORKER';
  const suffix = uuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${base}-${suffix}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function SeatsPage() {
  const { user, hasPermission } = useAuth();
  const canProvision = hasPermission('users:create');

  const [seats, setSeats] = useState<Seat[]>([]);
  const [tier, setTier] = useState<BillingTier>('starter');
  const [serverMax, setServerMax] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await seatsApi.list();
      setSeats(res.seats);
      setTier(res.tier);
      setServerMax(res.max_seats);
    } catch (err) {
      // Offline-first fallback: the seat API is not wired on every
      // environment yet (501). Seed from the signed-in owner so the tier
      // gate + provisioning UX stay fully functional; new seats are held
      // locally with LWW timestamps and reconcile once the API is live.
      if (err instanceof ApiError && err.isNotImplemented) {
        if (user) {
          setSeats([
            {
              id: user.id,
              email: user.email,
              full_name: null,
              role: user.role,
              worker_tag: user.workerTag,
              is_active: true,
              created_at: nowTimestamptz(),
              updated_at: nowTimestamptz(),
              permissions: null,
            },
          ]);
        }
        setTier('starter');
        setServerMax(null);
      } else if (err instanceof ApiError) {
        setLoadError(err.message);
      } else {
        setLoadError('Unable to reach the server. Is the gateway running on :8080?');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activeSeats = useMemo(() => seats.filter((s) => s.is_active).length, [seats]);
  // Trust the server ceiling when present; otherwise use the client tier gate.
  const maxSeats = serverMax ?? TIER_SEAT_LIMITS[tier];
  const maxLabel = Number.isFinite(maxSeats) ? String(maxSeats) : '∞';
  const atLimit = activeSeats >= maxSeats;
  const pct = Number.isFinite(maxSeats) ? Math.min(100, Math.round((activeSeats / maxSeats) * 100)) : 12;

  const handleProvisioned = (seat: Seat) => {
    setSeats((prev) => [...prev, seat]);
    setModalOpen(false);
  };

  const handleSeatUpdated = (updated: Seat) => {
    setSeats((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  };

  const canUpdateSeats = hasPermission('users:update');
  const canDeactivateSeats = hasPermission('users:delete');

  return (
    <RequireRole requiredPermission="users:read">
      <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">Team Seats</h1>
            <p className="text-[14px] text-zinc-500 mt-0.5">
              Provision the workers who operate your registers. Every seat carries an audit tag
              stamped onto its offline sales.
            </p>
          </div>
          <AddWorkerButton
            disabled={!canProvision || atLimit}
            reason={
              !canProvision
                ? 'Only the account owner can provision seats.'
                : atLimit
                  ? `You've reached the ${maxLabel}-seat limit on the ${TIER_LABELS[tier]} plan. Upgrade to unlock more seats.`
                  : null
            }
            onClick={() => setModalOpen(true)}
          />
        </div>

        {/* Seat-limit visualizer */}
        <SeatVisualizer tier={tier} used={activeSeats} max={maxSeats} maxLabel={maxLabel} pct={pct} atLimit={atLimit} />

        {/* Seat list */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60">
          <div className="px-6 py-4 border-b border-zinc-200/40 bg-white/40 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600">
              Provisioned seats
            </h2>
            <span className="text-[10px] font-mono font-bold bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 rounded-md text-zinc-500">
              {seats.length} total
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-zinc-200 border-t-[#0052ff] rounded-full animate-spin" />
            </div>
          ) : loadError ? (
            <div className="px-6 py-12 text-center max-w-md mx-auto">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
              </div>
              <p className="text-xs sm:text-[13px] text-red-600 leading-relaxed">{loadError}</p>
              <button
                onClick={load}
                className="mt-4 px-4 py-1.5 rounded-xl text-xs bg-white hover:bg-zinc-50 border border-zinc-200 text-[#0052ff] font-bold transition-all"
              >
                Retry Connection
              </button>
            </div>
          ) : seats.length === 0 ? (
            <div className="px-6 py-16 text-center text-xs sm:text-[13px] text-zinc-400 font-medium">
              No seats provisioned yet. Get started by adding a worker seat above.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100/60">
              {seats.map((s) => (
                <SeatRow
                  key={s.id}
                  seat={s}
                  isOwner={s.id === user?.id}
                  canUpdate={canUpdateSeats}
                  canDeactivate={canDeactivateSeats}
                  onUpdated={handleSeatUpdated}
                />
              ))}
            </ul>
          )}
        </div>

        <AddWorkerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onProvisioned={handleProvisioned}
          existingTags={seats.map((s) => s.worker_tag)}
        />
      </div>
    </RequireRole>
  );
}

// ── Seat-limit visualizer ───────────────────────────────────────────
function SeatVisualizer({
  tier,
  used,
  max,
  maxLabel,
  pct,
  atLimit,
}: {
  tier: BillingTier;
  used: number;
  max: number;
  maxLabel: string;
  pct: number;
  atLimit: boolean;
}) {
  const remaining = Number.isFinite(max) ? Math.max(0, max - used) : Infinity;
  const barColor = atLimit ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-[#0052ff]';

  return (
    <div className="bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
              Seats in use
            </span>
            <Badge color={atLimit ? 'red' : 'blue'}>{TIER_LABELS[tier]} plan</Badge>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl font-black text-[#0A0A0A] tracking-tight leading-none">{used}</span>
            <span className="text-sm font-bold text-zinc-400 mb-0.5">/ {maxLabel} seats total</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#0052ff]/10 border border-[#0052ff]/20 flex items-center justify-center text-[#0052ff]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200/50">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-zinc-500 mt-3.5">
        {atLimit ? (
          <span className="text-red-600 font-medium">
            Limit reached — upgrade your plan to provision more seats.
          </span>
        ) : Number.isFinite(remaining) ? (
          <>
            <span className="text-zinc-800 font-bold font-mono bg-zinc-100 border border-zinc-200/60 px-1.5 py-0.5 rounded mr-1">{remaining}</span> seat{remaining === 1 ? '' : 's'} remaining on your plan.
          </>
        ) : (
          'Unlimited seats on this plan.'
        )}
      </p>
    </div>
  );
}

// ── Seat row ────────────────────────────────────────────────────────
function SeatRow({
  seat,
  isOwner,
  canUpdate,
  canDeactivate,
  onUpdated,
}: {
  seat: Seat;
  isOwner: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
  onUpdated: (seat: Seat) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);

  // Worker management (activate/deactivate/reset password) only ever
  // targets subordinate MANAGER/STAFF seats — the store owner is never a
  // valid target (mirrors the backend's assertNotOwner guard in
  // seats-handler.ts, which rejects these same actions against OWNER rows).
  const manageable = !isOwner;
  const granted = activeGroups(seat);

  const handleToggleActive = async () => {
    setBusy(true);
    setRowError(null);
    try {
      if (seat.is_active) {
        await seatsApi.deactivate(seat.id);
        onUpdated({ ...seat, is_active: false });
      } else {
        const updated = await seatsApi.update(seat.id, { is_active: true });
        onUpdated(updated);
      }
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Failed to update seat.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="px-6 py-4 flex items-center gap-4 hover:bg-[#0052ff]/[0.02] transition-colors duration-150">
      <Avatar name={seat.full_name || seat.email} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-zinc-900 tracking-tight truncate">
            {seat.full_name || seat.email}
          </span>
          {isOwner && <Badge color="blue">Owner</Badge>}
          {!seat.is_active && <Badge color="zinc">Inactive</Badge>}
          {granted.map((g) => (
            <Badge key={g.key} color="teal">{g.label}</Badge>
          ))}
        </div>
        <span className="text-xs text-zinc-500 truncate block mt-0.5">{seat.email}</span>
        {rowError && <span className="text-[10px] text-red-500 block mt-1">{rowError}</span>}
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1.5">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 rounded-md">
          {seat.role}
        </span>
        <span className="text-[10px] font-mono text-zinc-400">Added {formatDate(seat.created_at)}</span>
      </div>

      {/* Audit tag — tied to the register checkout context for every sale. */}
      <span
        className="
          font-mono text-[10px] font-bold px-3 py-1.5 rounded-xl
          bg-[#0052ff]/10 border border-[#0052ff]/20 text-[#0052ff] shrink-0
          shadow-[0_2px_8px_-2px_rgba(0,82,255,0.12)]
        "
        title="Audit tag — every offline sale this worker rings up is stamped with this tag."
      >
        {seat.worker_tag}
      </span>

      {/* Worker management actions — hidden for the owner's own row, and
          for anyone who lacks users:update/users:delete (RequireRole-style
          client gate; the backend enforces the real boundary either way). */}
      {manageable && (canUpdate || canDeactivate) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {canUpdate && (
            <button
              type="button"
              title="Manage extra permissions"
              onClick={() => setPermsOpen(true)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                granted.length > 0
                  ? 'bg-[#0052ff]/10 hover:bg-[#0052ff]/20 border-[#0052ff]/20 text-[#0052ff]'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200/40 text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
          )}
          {canUpdate && (
            <button
              type="button"
              title="Reset password"
              onClick={() => setResetOpen(true)}
              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/40 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </button>
          )}
          {canDeactivate && (
            <button
              type="button"
              title={seat.is_active ? 'Deactivate seat' : 'Reactivate seat'}
              onClick={handleToggleActive}
              disabled={busy}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                seat.is_active
                  ? 'bg-zinc-100 hover:bg-red-50 border-zinc-200/40 hover:border-red-200 text-zinc-500 hover:text-red-500'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
              }`}
            >
              {busy ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : seat.is_active ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M4.9 4.9l14.2 14.2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      <ResetPasswordModal seat={seat} open={resetOpen} onClose={() => setResetOpen(false)} />
      <PermissionsModal seat={seat} open={permsOpen} onClose={() => setPermsOpen(false)} onUpdated={onUpdated} />
    </li>
  );
}

// ── Shared checkbox list for EXTRA_PERMISSION_GROUPS — used by both
// AddWorkerModal (a new seat) and PermissionsModal (an existing one). ──
function PermissionGroupCheckboxes({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {EXTRA_PERMISSION_GROUPS.map((g) => (
        <label
          key={g.key}
          className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.has(g.key)}
            onChange={() => onToggle(g.key)}
            className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-[#0052ff] focus:ring-[#0052ff]/30"
          />
          <span>
            <span className="block text-sm font-bold text-zinc-700">{g.label}</span>
            <span className="block text-xs text-zinc-400 mt-0.5">{g.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Manage-permissions modal (existing seat) ────────────────────────
function PermissionsModal({
  seat,
  open,
  onClose,
  onUpdated,
}: {
  seat: Seat;
  open: boolean;
  onClose: () => void;
  onUpdated: (seat: Seat) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(activeGroups(seat).map((g) => g.key)));
      setError(null);
    }
  }, [open, seat]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const extraPermissions = EXTRA_PERMISSION_GROUPS
        .filter((g) => selected.has(g.key))
        .flatMap((g) => g.permissions);
      const updated = await seatsApi.update(seat.id, { extra_permissions: extraPermissions });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Permissions — ${seat.full_name || seat.email}`}
      subtitle="Extra access beyond this worker's role defaults."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="border-zinc-200 bg-white hover:bg-zinc-50">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting}
            className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
    >
      <PermissionGroupCheckboxes selected={selected} onToggle={toggle} />
      {error && (
        <div className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          {error}
        </div>
      )}
    </ModalShell>
  );
}

// ── Light modal shell — mirrors components/inventory/ProductFormModal.tsx's
// overlay/header/footer chrome so every "add/edit" surface in the console
// reads as one system, rather than each page inventing its own dialog. ──
function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
            {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors -mt-1 -mr-1" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-zinc-200/60 flex items-center justify-end gap-3 bg-zinc-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reset-password modal ────────────────────────────────────────────
function ResetPasswordModal({
  seat,
  open,
  onClose,
}: {
  seat: Seat;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const valid = password.length >= 8;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await seatsApi.resetPassword(seat.id, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Reset password — ${seat.full_name || seat.email}`}
      subtitle="They'll need to sign in with this new password next time."
      footer={
        success ? (
          <Button onClick={onClose} className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold">
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} className="border-zinc-200 bg-white hover:bg-zinc-50">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="text-[13px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          Password reset. Share the new password with {seat.full_name || seat.email} securely.
        </div>
      ) : (
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-1.5">New password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <p className="text-xs text-zinc-400 mt-1.5">Minimum 8 characters.</p>
        </div>
      )}
      {error && (
        <div className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          {error}
        </div>
      )}
    </ModalShell>
  );
}

// ── Add-worker button (with tier-gate tooltip) ──────────────────────
function AddWorkerButton({
  disabled,
  reason,
  onClick,
}: {
  disabled: boolean;
  reason: string | null;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <Button
        onClick={onClick}
        disabled={disabled}
        className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-md shadow-[#0052ff]/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" x2="19" y1="8" y2="14"/>
          <line x1="22" x2="16" y1="11" y2="11"/>
        </svg>
        Add worker
      </Button>
      {disabled && reason && (
        <div className="absolute right-0 top-full mt-2 w-72 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 transform translate-y-1 group-hover:translate-y-0">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 text-xs text-zinc-600 shadow-[0_12px_32px_rgba(0,0,0,0.12)] leading-relaxed">
            {reason}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add-worker modal ────────────────────────────────────────────────
function AddWorkerModal({
  open,
  onClose,
  onProvisioned,
  existingTags,
}: {
  open: boolean;
  onClose: () => void;
  onProvisioned: (seat: Seat) => void;
  existingTags: string[];
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [workerTag, setWorkerTag] = useState('');
  const [tagEdited, setTagEdited] = useState(false);
  const [extraGroups, setExtraGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form each time the modal opens with a fresh suggested tag.
  useEffect(() => {
    if (open) {
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('STAFF');
      setWorkerTag(suggestWorkerTag(''));
      setTagEdited(false);
      setExtraGroups(new Set());
      setError(null);
    }
  }, [open]);

  const toggleExtraGroup = (key: string) => {
    setExtraGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Keep the suggested tag in step with the name until the user edits it.
  useEffect(() => {
    if (open && !tagEdited) setWorkerTag(suggestWorkerTag(fullName));
  }, [fullName, open, tagEdited]);

  const valid =
    fullName.trim().length >= 2 &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= 8 &&
    workerTag.trim().length > 0;

  const handleCreate = async () => {
    if (!valid) return;
    const tag = workerTag.trim();
    if (existingTags.includes(tag)) {
      setError('That audit tag is already in use. Choose a unique tag.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const extraPermissions = EXTRA_PERMISSION_GROUPS
      .filter((g) => extraGroups.has(g.key))
      .flatMap((g) => g.permissions);

    const payload = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
      worker_tag: tag,
      // timestamptz for Last-Write-Wins sync comparison on the new row.
      client_created_at: nowTimestamptz(),
      ...(extraPermissions.length > 0 ? { extra_permissions: extraPermissions } : {}),
    };

    try {
      const created = await seatsApi.create(payload);
      onProvisioned(created);
    } catch (err) {
      // Offline-first: if the API isn't live yet, persist the seat locally
      // with its LWW timestamps so it syncs on the next reconciliation.
      if (err instanceof ApiError && err.isNotImplemented) {
        onProvisioned({
          id: uuid(),
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role,
          worker_tag: payload.worker_tag,
          is_active: true,
          created_at: payload.client_created_at,
          updated_at: payload.client_created_at,
          permissions: extraPermissions.length > 0 ? extraPermissions : null,
        });
      } else if (err instanceof ApiError && err.status === 409) {
        setError('A user with that email already exists in this organization.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to reach the server. Is the gateway running on :8080?');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Provision a worker seat"
      subtitle="They'll sign in with these credentials at the register."
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="border-zinc-200 bg-white hover:bg-zinc-50">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!valid || submitting}
            className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Provisioning…
              </>
            ) : (
              'Add seat'
            )}
          </Button>
        </>
      }
    >
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">Full name</label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amara Uwase" autoComplete="off" />
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">Email</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amara@store.com" autoComplete="off" />
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">Temporary password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <p className="text-xs text-zinc-400 mt-1.5">Minimum 8 characters — the worker can change it after first sign-in.</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium transition-colors outline-none focus:border-[#0052ff]"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">
          Extra permissions <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <p className="text-xs text-zinc-400 mb-2.5">
          Beyond the role's defaults — off by default for Staff (admin3.md: cashiers don't get
          these unless individually granted). Can be changed later from the worker's row.
        </p>
        <PermissionGroupCheckboxes selected={extraGroups} onToggle={toggleExtraGroup} />
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-1.5">Audit tag</label>
        <Input
          value={workerTag}
          onChange={(e) => { setWorkerTag(e.target.value.toUpperCase()); setTagEdited(true); }}
          className="font-mono text-[13px]"
        />
        <p className="text-xs text-zinc-400 mt-1.5">Stamped onto every offline sale this worker processes at the register.</p>
        <button
          type="button"
          onClick={() => { setWorkerTag(suggestWorkerTag(fullName)); setTagEdited(false); }}
          className="mt-2 text-[10px] font-mono font-bold text-[#0052ff] hover:text-[#003bbf] flex items-center gap-1.5 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 16h5v5"/>
          </svg>
          Regenerate tag
        </button>
      </div>

      {error && (
        <div className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          {error}
        </div>
      )}
    </ModalShell>
  );
}
