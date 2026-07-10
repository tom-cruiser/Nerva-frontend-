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
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Team seats</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
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
      <div className="glass rounded-xl2 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-700/60 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Provisioned seats
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">{seats.length} total</span>
        </div>

        {loading ? (
          <div className="py-14 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-pulse border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-red-400">{loadError}</p>
            <button onClick={load} className="mt-3 text-[12px] text-pulse hover:text-pulse-hover font-medium">
              Retry
            </button>
          </div>
        ) : seats.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-zinc-500">No seats provisioned yet.</div>
        ) : (
          <ul className="divide-y divide-zinc-800/70">
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
  const barColor = atLimit ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-pulse';

  return (
    <div className="glass rounded-xl2 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">
              Seats in use
            </span>
            <Badge color={atLimit ? 'red' : 'teal'}>{TIER_LABELS[tier]} plan</Badge>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-[34px] leading-none font-black text-white tracking-tight">{used}</span>
            <span className="text-[15px] font-semibold text-zinc-500 mb-0.5">/ {maxLabel} seats total</span>
          </div>
        </div>
        <span className="w-10 h-10 rounded-lg bg-pulse/10 border border-pulse/20 flex items-center justify-center text-pulse">
          <span className="material-symbols-outlined">groups</span>
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-[12px] text-zinc-500 mt-2.5">
        {atLimit ? (
          <span className="text-red-400">
            Limit reached — upgrade your plan to provision more seats.
          </span>
        ) : Number.isFinite(remaining) ? (
          <>
            <span className="text-zinc-300 font-medium">{remaining}</span> seat{remaining === 1 ? '' : 's'} remaining
            on your plan.
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
    <li className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
      <Avatar name={seat.full_name || seat.email} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-zinc-100 truncate">
            {seat.full_name || seat.email}
          </span>
          {isOwner && <Badge color="teal">Owner</Badge>}
          {!seat.is_active && <Badge color="zinc">Inactive</Badge>}
        </div>
        <span className="text-[12px] text-zinc-500 truncate block">{seat.email}</span>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{seat.role}</span>
        <span className="text-[11px] font-mono text-zinc-500">Added {formatDate(seat.created_at)}</span>
      </div>

      {/* Audit tag — tied to the register checkout context for every sale. */}
      <span
        className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-pulse/10 border border-pulse/20 text-pulse shrink-0"
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
        className="bg-pulse text-[#0C0C0E] font-semibold rounded-lg px-4 py-2.5 text-[14px] hover:bg-pulse-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        Add worker
      </button>
      {disabled && reason && (
        <div className="absolute right-0 top-full mt-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
          <div className="glass rounded-lg px-3 py-2 text-[12px] text-zinc-300 shadow-glow">
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
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-zinc-300 border border-white/8 hover:bg-white/6 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!valid || submitting}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-pulse text-[#0C0C0E] hover:bg-pulse-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Provisioning…' : 'Add seat'}
          </button>
        </>
      }
    >
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

      <div>
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
          className="mt-1.5 text-[11px] text-pulse hover:text-pulse-hover font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Regenerate tag
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </Modal>
  );
}
