'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, UserPlus, UserMinus, Skull, Database, Server, MessageCircle,
  Filter,
} from 'lucide-react';
import { platformOps } from '@/lib/superadmin-api';
import type {
  PlatformStaffRow, PlatformHealth, PlatformErrorLogEntry, TenantRateLimit,
} from '@/lib/superadmin-api';
import { formatRelative, formatDate } from '@/lib/format';
import { useAuth } from '@/app/context/AuthContext';
import { Panel, Pill, AppButton, LightField, LightSelect, NoticeBanner, ErrorBanner, type Notice } from '../_ui';

const KILL_ALL_CONFIRMATION = 'KILL ALL SESSIONS';

const PLATFORM_ROLE_OPTIONS = [
  { value: 'SUPPORT', label: 'Support (read-only)' },
  { value: 'BILLING_ADMIN', label: 'Billing admin' },
  { value: 'SUPERADMIN', label: 'Superadmin (full access)' },
];

export default function PlatformOpsPage() {
  const { user } = useAuth();
  const canWrite = user?.permissions.includes('superadmin:access') ?? false;

  const [staff, setStaff] = useState<PlatformStaffRow[]>([]);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [rateLimits, setRateLimits] = useState<TenantRateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [staffRes, healthRes, rlRes] = await Promise.allSettled([
      platformOps.listStaff(),
      platformOps.health(),
      platformOps.rateLimits(),
    ]);
    if (staffRes.status === 'fulfilled') setStaff(staffRes.value.staff);
    if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
    if (rlRes.status === 'fulfilled') setRateLimits(rlRes.value.rate_limits);
    if (staffRes.status === 'rejected' && healthRes.status === 'rejected') {
      setError('Unable to reach the superadmin service.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Platform Ops</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Staff RBAC, session control, infrastructure health, and error stream.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200/70 bg-white/70 hover:bg-white hover:text-[#0052ff] transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner text={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StaffSection staff={staff} canWrite={canWrite} onChanged={load} />
        <HealthAndKillSection health={health} canWrite={canWrite} />
      </div>

      <RateLimitsOverview rateLimits={rateLimits} canWrite={canWrite} onChanged={setRateLimits} />

      <ErrorLogSection />
    </div>
  );
}

// ─── Platform staff RBAC ────────────────────────────────────────────────────

function StaffSection({
  staff, canWrite, onChanged,
}: { staff: PlatformStaffRow[]; canWrite: boolean; onChanged: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SUPPORT');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  return (
    <Panel>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Platform staff</h3>
      {notice && <div className="mb-3"><NoticeBanner notice={notice} /></div>}

      {canWrite && (
        <div className="flex items-end gap-2 mb-4">
          <div className="flex-1">
            <LightField label="Email (must already have an account)" value={email} onChange={setEmail} placeholder="ops@nerva.internal" />
          </div>
          <div className="w-48">
            <LightSelect label="Role" value={role} onChange={setRole} options={PLATFORM_ROLE_OPTIONS} />
          </div>
          <AppButton
            size="sm" icon={<UserPlus size={14} />} loading={busy === 'grant'}
            disabled={!email.trim()}
            onClick={async () => {
              setBusy('grant'); setNotice(null);
              try {
                await platformOps.grantStaff(email.trim(), role as 'SUPPORT' | 'BILLING_ADMIN' | 'SUPERADMIN');
                setNotice({ kind: 'success', text: `Granted ${role} to ${email}.` });
                setEmail('');
                onChanged();
              } catch (err) {
                setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to grant access' });
              } finally {
                setBusy(null);
              }
            }}
          >
            Grant
          </AppButton>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {staff.map((s) => (
          <div key={s.user_id} className="flex items-center justify-between py-2">
            <div>
              <div className="text-[13px] text-zinc-800 font-medium">{s.email}</div>
              <div className="text-[11px] text-zinc-400">Granted {formatRelative(s.granted_at)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill color={s.platform_role === 'SUPERADMIN' ? 'red' : s.platform_role === 'BILLING_ADMIN' ? 'amber' : 'blue'}>
                {s.platform_role}
              </Pill>
              {canWrite && (
                <button
                  className="text-zinc-400 hover:text-red-500 disabled:opacity-40"
                  title="Revoke"
                  disabled={busy === s.user_id}
                  onClick={async () => {
                    setBusy(s.user_id); setNotice(null);
                    try {
                      await platformOps.revokeStaff(s.email);
                      setNotice({ kind: 'success', text: `Revoked access for ${s.email}.` });
                      onChanged();
                    } catch (err) {
                      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to revoke access' });
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        {staff.length === 0 && <p className="text-[13px] text-zinc-400 py-2">No platform staff granted yet.</p>}
      </div>
    </Panel>
  );
}

// ─── Health + kill-all-sessions ─────────────────────────────────────────────

function HealthAndKillSection({ health, canWrite }: { health: PlatformHealth | null; canWrite: boolean }) {
  const [confirm, setConfirm] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  return (
    <div className="space-y-5">
      <Panel>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Infrastructure health</h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-zinc-600"><Database size={14} className="text-zinc-400" /> Database pool</span>
            <span className="font-mono text-zinc-500">
              {health ? `${health.database.total - health.database.idle}/${health.database.max} in use · ${health.database.waiting} waiting` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-zinc-600"><Server size={14} className="text-zinc-400" /> Redis</span>
            <span className="font-mono text-zinc-500">{health ? `${health.redis.status}${health.redis.latency_ms != null ? ` · ${health.redis.latency_ms}ms` : ''}` : '—'}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-zinc-600"><MessageCircle size={14} className="text-zinc-400" /> WhatsApp gateway</span>
            <Pill color={health ? (health.whatsapp_gateway.reachable ? 'green' : 'red') : 'zinc'} dot>
              {health ? (health.whatsapp_gateway.reachable ? 'Reachable' : 'Unreachable') : 'Unknown'}
            </Pill>
          </div>
        </div>
      </Panel>

      {canWrite && (
        <div className="rounded-2xl border border-red-200/50 bg-red-50/40 p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-600 mb-2">Danger zone</h3>
          <p className="text-[12px] text-zinc-500 mb-3">
            Force every signed-in user on the entire platform — every tenant, every role — to sign back in. Use only for a suspected platform-wide credential compromise.
          </p>
          {notice && <div className="mb-3"><NoticeBanner notice={notice} /></div>}
          <div className="space-y-2.5">
            <LightField label="Reason" value={reason} onChange={setReason} />
            <LightField label={`Type "${KILL_ALL_CONFIRMATION}" to confirm`} value={confirm} onChange={setConfirm} mono />
            <AppButton
              variant="danger" size="sm" icon={<Skull size={14} />} loading={busy}
              disabled={confirm !== KILL_ALL_CONFIRMATION || !reason.trim()}
              onClick={async () => {
                setBusy(true); setNotice(null);
                try {
                  const res = await platformOps.killAllSessions(reason);
                  setNotice({ kind: 'success', text: `Signed out ${res.user_count} user(s) platform-wide.` });
                  setConfirm(''); setReason('');
                } catch (err) {
                  setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to kill sessions' });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Kill every session on the platform
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rate limits overview ───────────────────────────────────────────────────

function RateLimitsOverview({
  rateLimits, canWrite, onChanged,
}: { rateLimits: TenantRateLimit[]; canWrite: boolean; onChanged: React.Dispatch<React.SetStateAction<TenantRateLimit[]>> }) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <Panel>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">Per-tenant rate limit overrides</h3>
      <p className="text-[12px] text-zinc-400 mb-3">New overrides are set from a tenant's detail panel on the Tenants page.</p>
      {rateLimits.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No tenant has a rate-limit override — every tenant is on the platform default.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {rateLimits.map((r) => (
            <div key={r.tenant_id} className="flex items-center justify-between py-2 text-[13px]">
              <div>
                <span className="font-mono text-zinc-700">{r.max_requests} req / {r.window_seconds}s</span>
                {r.reason && <span className="text-zinc-400 ml-2">— {r.reason}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 font-mono">{r.tenant_id.slice(0, 8)}…</span>
                {canWrite && (
                  <button
                    className="text-[11px] text-zinc-400 hover:text-red-500 underline disabled:opacity-40"
                    disabled={busy === r.tenant_id}
                    onClick={async () => {
                      setBusy(r.tenant_id);
                      try {
                        await platformOps.resetRateLimit(r.tenant_id);
                        onChanged((prev) => prev.filter((x) => x.tenant_id !== r.tenant_id));
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Error log stream ────────────────────────────────────────────────────────

function ErrorLogSection() {
  const [errors, setErrors] = useState<PlatformErrorLogEntry[]>([]);
  const [service, setService] = useState('');
  const [minStatus, setMinStatus] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformOps.errorLog({
        service: service.trim() || undefined,
        min_status: minStatus.trim() ? Number(minStatus) : undefined,
      });
      setErrors(res.errors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load error log');
    } finally {
      setLoading(false);
    }
  }, [service, minStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <Panel>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Backend error log</h3>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-zinc-400" />
          <input
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="service (e.g. auth-tenant)"
            className="bg-white/70 border border-zinc-200/80 rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-700 placeholder-zinc-400 outline-none focus:bg-white focus:border-[#0052ff]/50 w-44"
          />
          <input
            value={minStatus}
            onChange={(e) => setMinStatus(e.target.value)}
            placeholder="min status"
            className="bg-white/70 border border-zinc-200/80 rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-700 placeholder-zinc-400 outline-none focus:bg-white focus:border-[#0052ff]/50 w-24"
          />
          <AppButton size="sm" variant="ghost" loading={loading} onClick={load}>Apply</AppButton>
        </div>
      </div>
      {error && <p className="text-[12.5px] text-red-500 mb-2">{error}</p>}
      <div className="max-h-96 overflow-y-auto space-y-1.5">
        {errors.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 py-2 border-b border-zinc-100 last:border-b-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill color={e.status_code >= 500 ? 'red' : 'amber'}>{e.status_code}</Pill>
                <span className="text-[12px] font-mono text-zinc-400">{e.service}</span>
                {e.error_code && <span className="text-[11px] text-zinc-400">{e.error_code}</span>}
              </div>
              <p className="text-[12.5px] text-zinc-700 mt-1 truncate" title={e.message}>{e.message}</p>
              {e.path && <p className="text-[11px] text-zinc-400 font-mono truncate">{e.path}</p>}
            </div>
            <span className="text-[11px] text-zinc-400 shrink-0" title={formatDate(e.created_at)}>{formatRelative(e.created_at)}</span>
          </div>
        ))}
        {errors.length === 0 && !loading && <p className="text-[13px] text-zinc-400 py-4">No matching errors.</p>}
      </div>
    </Panel>
  );
}
