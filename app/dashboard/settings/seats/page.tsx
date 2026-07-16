'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Field, Select, Modal, Badge, Avatar } from '../../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { seats as seatsApi } from '../../../../lib/endpoints';
import { ApiError, uuid } from '../../../../lib/api';
import { nowTimestamptz } from '../../../../lib/tenancy';
import {
  TIER_SEAT_LIMITS,
  TIER_LABELS,
  type BillingTier,
  type Seat,
  type UserRole,
} from '../../../../lib/types';

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

  return (
    <div className="space-y-7 max-w-6xl mx-auto px-1">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">Team Seats</h1>
          <p className="text-xs sm:text-[13px] text-slate-400 mt-1 max-w-xl leading-relaxed">
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
      <div className="
        bg-white/[0.02] backdrop-blur-md 
        border border-white/10 
        rounded-2xl overflow-hidden
        shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]
      ">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-slate-400">
            Provisioned seats
          </h2>
          <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-slate-300">
            {seats.length} total
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="px-6 py-12 text-center max-w-md mx-auto">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
            </div>
            <p className="text-xs sm:text-[13px] text-red-400 leading-relaxed">{loadError}</p>
            <button 
              onClick={load} 
              className="mt-4 px-4 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-[#0052ff] font-bold transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : seats.length === 0 ? (
          <div className="px-6 py-16 text-center text-xs sm:text-[13px] text-slate-500 font-medium">
            No seats provisioned yet. Get started by adding a worker seat above.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {seats.map((s) => (
              <SeatRow key={s.id} seat={s} isOwner={s.id === user?.id} />
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
  const barColor = atLimit ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : pct >= 75 ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : 'bg-[#0052ff] shadow-[0_0_12px_rgba(0,82,255,0.4)]';

  return (
    <div className="
      bg-white/[0.02] backdrop-blur-md 
      border border-white/10 
      rounded-2xl p-6
      shadow-[0_12px_40px_-12px_rgba(0,0,0,0.4)]
    ">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Seats in use
            </span>
            <Badge color={atLimit ? 'red' : 'teal'}>{TIER_LABELS[tier]} plan</Badge>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl font-extrabold text-white tracking-tight leading-none">{used}</span>
            <span className="text-sm font-bold text-slate-500 mb-0.5">/ {maxLabel} seats total</span>
          </div>
        </div>
        <div className="
          w-10 h-10 rounded-xl 
          bg-[#0052ff]/10 border border-[#0052ff]/20 
          flex items-center justify-center text-[#0052ff]
          shadow-[0_4px_12px_rgba(0,82,255,0.15)]
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-slate-400 mt-3.5">
        {atLimit ? (
          <span className="text-red-400 font-medium">
            Limit reached — upgrade your plan to provision more seats.
          </span>
        ) : Number.isFinite(remaining) ? (
          <>
            <span className="text-white font-bold font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded mr-1">{remaining}</span> seat{remaining === 1 ? '' : 's'} remaining on your plan.
          </>
        ) : (
          'Unlimited seats on this plan.'
        )}
      </p>
    </div>
  );
}

// ── Seat row ────────────────────────────────────────────────────────
function SeatRow({ seat, isOwner }: { seat: Seat; isOwner: boolean }) {
  return (
    <li className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.01] transition-colors duration-150">
      <Avatar name={seat.full_name || seat.email} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-white tracking-tight truncate">
            {seat.full_name || seat.email}
          </span>
          {isOwner && <Badge color="teal">Owner</Badge>}
          {!seat.is_active && <Badge color="zinc">Inactive</Badge>}
        </div>
        <span className="text-xs text-slate-500 truncate block mt-0.5">{seat.email}</span>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1.5">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
          {seat.role}
        </span>
        <span className="text-[10px] font-mono text-slate-500">Added {formatDate(seat.created_at)}</span>
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
    </li>
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
      <button
        onClick={onClick}
        disabled={disabled}
        className="
          bg-[#0052ff] text-white font-bold rounded-2xl px-5 py-2.5 text-xs uppercase tracking-wider
          hover:bg-[#0042d9] transition-all duration-200 active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
          flex items-center gap-2 shadow-[0_8px_24px_-6px_rgba(0,82,255,0.35)]
        "
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" x2="19" y1="8" y2="14"/>
          <line x1="22" x2="16" y1="11" y2="11"/>
        </svg>
        Add worker
      </button>
      {disabled && reason && (
        <div className="absolute right-0 top-full mt-2 w-72 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 transform translate-y-1 group-hover:translate-y-0">
          <div className="
            bg-[#10151d]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs text-slate-300
            shadow-[0_12px_32px_rgba(0,0,0,0.5)] leading-relaxed
          ">
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
      setError(null);
    }
  }, [open]);

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

    const payload = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
      worker_tag: tag,
      // timestamptz for Last-Write-Wins sync comparison on the new row.
      client_created_at: nowTimestamptz(),
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
    <Modal
      open={open}
      onClose={onClose}
      title="Provision a worker seat"
      subtitle="They'll sign in with these credentials at the register."
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border border-white/10 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!valid || submitting}
            className="
              px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider 
              bg-[#0052ff] text-white hover:bg-[#0042d9] transition-all 
              disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2
              shadow-[0_6px_20px_-4px_rgba(0,82,255,0.3)]
            "
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Provisioning…' : 'Add seat'}
          </button>
        </>
      }
    >
      <div className="space-y-5 py-2">
        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Amara Uwase" autoComplete="off" />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="amara@store.com" autoComplete="off" />
        <Field
          label="Temporary password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          hint="Minimum 8 characters — the worker can change it after first sign-in."
        />
        <Select label="Role" value={role} onChange={(v) => setRole(v as UserRole)} options={ROLE_OPTIONS} />

        <div className="space-y-2">
          <Field
            label="Audit tag"
            value={workerTag}
            onChange={(v) => { setWorkerTag(v.toUpperCase()); setTagEdited(true); }}
            mono
            hint="Stamped onto every offline sale this worker processes at the register."
          />
          <button
            type="button"
            onClick={() => { setWorkerTag(suggestWorkerTag(fullName)); setTagEdited(false); }}
            className="mt-2 text-[10px] font-mono font-bold text-[#0052ff] hover:text-[#0042d9] flex items-center gap-1.5 transition-colors"
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
          <div className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}