'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Megaphone, AlertTriangle, Ban, Pencil, Trash2, Check, X } from 'lucide-react';
import { settings } from '@/lib/superadmin-api';
import type { PlatformSettings, AnnouncementRow } from '@/lib/superadmin-api';
import { formatDate, formatRelative } from '@/lib/format';
import { useAuth } from '@/app/context/AuthContext';
import { Panel, Pill, AppButton, LightField, LightSelect, NoticeBanner, ErrorBanner, type PillColor, type Notice } from '../_ui';

const LEVEL_OPTIONS = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'CRITICAL', label: 'Critical' },
];

const LEVEL_COLOR: Record<AnnouncementRow['level'], PillColor> = {
  INFO: 'blue', WARNING: 'amber', CRITICAL: 'red',
};

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const canWrite = user?.permissions.includes('superadmin:access') ?? false;

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, announcementsRes] = await Promise.all([settings.get(), settings.listAnnouncements()]);
      setPlatformSettings(settingsRes.settings);
      setAnnouncements(announcementsRes.announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Settings</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Global platform configuration and shop-owner broadcasts.</p>
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

      {platformSettings && <PlatformSettingsCard settings={platformSettings} canWrite={canWrite} onSaved={load} />}

      <AnnouncementsCard announcements={announcements} canWrite={canWrite} onChanged={load} />
    </div>
  );
}

function PlatformSettingsCard({
  settings: current, canWrite, onSaved,
}: { settings: PlatformSettings; canWrite: boolean; onSaved: () => void }) {
  const [currency, setCurrency] = useState(current.default_currency);
  const [timezone, setTimezone] = useState(current.default_timezone);
  const [maintenanceMode, setMaintenanceMode] = useState(current.maintenance_mode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(current.maintenance_message ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const dirty = currency !== current.default_currency
    || timezone !== current.default_timezone
    || maintenanceMode !== current.maintenance_mode
    || maintenanceMessage !== (current.maintenance_message ?? '');

  return (
    <Panel>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Platform configuration</h3>
      {notice && <div className="mb-3"><NoticeBanner notice={notice} /></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LightField label="Default currency (ISO 4217)" value={currency} onChange={(v) => setCurrency(v.toUpperCase())} disabled={!canWrite} maxLength={3} />
        <LightField label="Default timezone (IANA)" value={timezone} onChange={setTimezone} disabled={!canWrite} placeholder="UTC" />
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-200/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-zinc-900 flex items-center gap-2">
              <AlertTriangle size={14} className={maintenanceMode ? 'text-amber-500' : 'text-zinc-300'} /> Maintenance mode
            </p>
            <p className="text-[12px] text-zinc-400 mt-0.5">Every non-superadmin request platform-wide is rejected with 503 while this is on.</p>
          </div>
          <button
            role="switch"
            aria-checked={maintenanceMode}
            disabled={!canWrite}
            onClick={() => setMaintenanceMode((v) => !v)}
            className={`w-11 h-6 rounded-full relative transition-colors disabled:opacity-40 ${maintenanceMode ? 'bg-amber-500' : 'bg-zinc-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${maintenanceMode ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {maintenanceMode && (
          <div className="mt-3">
            <LightField label="Message shown to tenants" value={maintenanceMessage} onChange={setMaintenanceMessage} disabled={!canWrite} placeholder="Nerva is undergoing scheduled maintenance…" />
          </div>
        )}
      </div>

      {canWrite && (
        <div className="mt-4 flex items-center gap-3">
          <AppButton
            size="sm" loading={busy} disabled={!dirty}
            onClick={async () => {
              setBusy(true); setNotice(null);
              try {
                await settings.update({
                  default_currency: currency,
                  default_timezone: timezone,
                  maintenance_mode: maintenanceMode,
                  maintenance_message: maintenanceMessage || null,
                });
                setNotice({ kind: 'success', text: 'Settings saved.' });
                onSaved();
              } catch (err) {
                setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
              } finally {
                setBusy(false);
              }
            }}
          >
            Save changes
          </AppButton>
          {current.updated_at && <span className="text-[11px] text-zinc-400">Last updated {formatRelative(current.updated_at)}</span>}
        </div>
      )}
    </Panel>
  );
}

function AnnouncementsCard({
  announcements, canWrite, onChanged,
}: { announcements: AnnouncementRow[]; canWrite: boolean; onChanged: () => void }) {
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editLevel, setEditLevel] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');

  const startEdit = (a: AnnouncementRow) => {
    setEditingId(a.id);
    setEditMessage(a.message);
    setEditLevel(a.level);
    setNotice(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editMessage.trim()) return;
    setBusy(id);
    try {
      await settings.updateAnnouncement(id, { message: editMessage.trim(), level: editLevel });
      setEditingId(null);
      setNotice({ kind: 'success', text: 'Announcement updated.' });
      onChanged();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this announcement? This cannot be undone.')) return;
    setBusy(id);
    try {
      await settings.deleteAnnouncement(id);
      setNotice({ kind: 'success', text: 'Announcement deleted.' });
      onChanged();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to delete' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1 flex items-center gap-2">
        <Megaphone size={13} className="text-[#0052ff]" /> Announcements
      </h3>
      <p className="text-[12px] text-zinc-400 mb-4">Broadcast a banner to every tenant's console (polled unauthenticated by every frontend).</p>

      {notice && <div className="mb-3"><NoticeBanner notice={notice} /></div>}

      {canWrite && (
        <div className="flex items-end gap-2.5 mb-5">
          <div className="flex-1">
            <LightField label="Message" value={message} onChange={setMessage} placeholder="e.g. Scheduled maintenance tonight 22:00–23:00 UTC" />
          </div>
          <div className="w-40">
            <LightSelect label="Level" value={level} onChange={(v) => setLevel(v as typeof level)} options={LEVEL_OPTIONS} />
          </div>
          <AppButton
            size="sm" loading={busy === 'create'} disabled={!message.trim()}
            onClick={async () => {
              setBusy('create'); setNotice(null);
              try {
                await settings.createAnnouncement(message.trim(), level);
                setMessage('');
                setNotice({ kind: 'success', text: 'Announcement published.' });
                onChanged();
              } catch (err) {
                setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to publish' });
              } finally {
                setBusy(null);
              }
            }}
          >
            Publish
          </AppButton>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {announcements.map((a) => (
          <div key={a.id} className="py-2.5">
            {editingId === a.id ? (
              <div className="flex items-end gap-2.5">
                <div className="flex-1">
                  <LightField label="Message" value={editMessage} onChange={setEditMessage} />
                </div>
                <div className="w-40">
                  <LightSelect
                    label="Level"
                    value={editLevel}
                    onChange={(v) => setEditLevel(v as typeof editLevel)}
                    options={LEVEL_OPTIONS}
                  />
                </div>
                <AppButton
                  size="sm" loading={busy === a.id} disabled={!editMessage.trim()}
                  onClick={() => saveEdit(a.id)}
                >
                  <Check size={14} />
                </AppButton>
                <button
                  title="Cancel"
                  disabled={busy === a.id}
                  className="text-zinc-400 hover:text-zinc-600 shrink-0 disabled:opacity-40 p-2"
                  onClick={cancelEdit}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill color={LEVEL_COLOR[a.level]}>{a.level}</Pill>
                    {!a.active && <Pill color="zinc">inactive</Pill>}
                    <span className="text-[11px] text-zinc-400">{formatDate(a.starts_at)}</span>
                  </div>
                  <p className="text-[13px] text-zinc-700 mt-1">{a.message}</p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      title="Edit"
                      disabled={busy === a.id}
                      className="text-zinc-400 hover:text-[#0052ff] p-1.5 disabled:opacity-40"
                      onClick={() => startEdit(a)}
                    >
                      <Pencil size={14} />
                    </button>
                    {a.active && (
                      <button
                        title="Deactivate"
                        disabled={busy === a.id}
                        className="text-zinc-400 hover:text-amber-500 p-1.5 disabled:opacity-40"
                        onClick={async () => {
                          setBusy(a.id); setNotice(null);
                          try {
                            await settings.deactivateAnnouncement(a.id);
                            onChanged();
                          } catch (err) {
                            setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to deactivate' });
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    <button
                      title="Delete"
                      disabled={busy === a.id}
                      className="text-zinc-400 hover:text-red-500 p-1.5 disabled:opacity-40"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {announcements.length === 0 && <p className="text-[13px] text-zinc-400 py-2">No announcements yet.</p>}
      </div>
    </Panel>
  );
}
