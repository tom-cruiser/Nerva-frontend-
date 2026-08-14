// components/whatsapp/ScheduledReportConfig.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { whatsapp } from '@/lib/api';
import type { WhatsappReportSchedule, WhatsappReportLogEntry } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import Button from '@/components/ui/Button';

const SECTION_LABELS: Record<string, string> = {
  sales_summary: 'Sales Summary',
  cashier_breakdown: 'Cashier Breakdown',
  low_stock_warnings: 'Low-Stock Warnings',
  profit_metrics: 'Profit Metrics',
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-[13px] outline-none focus:border-emerald-400';

// A curated fallback for browsers without Intl.supportedValuesOf (Safari <16.4) —
// covers every UTC offset band plus the regions this app's phone-number/currency
// examples already target (Central/West Africa) so the dropdown is never empty.
const FALLBACK_TIMEZONES = [
  'UTC', 'Africa/Lagos', 'Africa/Douala', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Africa/Cairo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Shanghai',
  'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

/** "Africa/Douala" -> "Africa/Douala (UTC+01:00)" — computed once at module
 *  load, not per-render, since formatting ~400 zones isn't free. */
function withUtcOffset(tz: string): { value: string; label: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return { value: tz, label: offset ? `${tz} (${offset.replace('GMT', 'UTC')})` : tz };
  } catch {
    return { value: tz, label: tz };
  }
}

const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = (() => {
  const zones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : FALLBACK_TIMEZONES;
  return zones.map(withUtcOffset).sort((a, b) => a.value.localeCompare(b.value));
})();

/**
 * Replaces the "⏰ Scheduled Messages" placeholder's inner content on
 * app/(app)/whatsapp/page.tsx — the outer Card wrapper there is untouched
 * (whatsapp-report.md's "don't redesign existing layouts" constraint).
 * Backed by the real GET/POST /api/v1/whatsapp/reports/schedule endpoints
 * (previously a stub that only console.log'd and echoed a fake success).
 */
export default function ScheduledReportConfig() {
  const [schedule, setSchedule] = useState<WhatsappReportSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logs, setLogs] = useState<WhatsappReportLogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const res = await whatsapp.getReportLogs();
      setLogs(res.logs);
    } catch (err) {
      setLogsError(err instanceof ApiError ? err.message : 'Failed to load delivery history');
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await whatsapp.getReportSchedule();
      // A never-configured schedule comes back defaulted to 'UTC' server-side
      // — pre-fill the browser's own detected zone instead so a shop owner
      // entering "8:00 PM" gets their actual local 8pm, not UTC 8pm. Only
      // applies before the first real save (updatedAt is still null);
      // once saved, always respect whatever timezone is on record.
      if (res.updatedAt === null && res.timezone === 'UTC') {
        try {
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (detected) res.timezone = detected;
        } catch {
          // Detection unsupported — leave the UTC default as-is.
        }
      }
      setSchedule(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadLogs(); }, [load, loadLogs]);

  const update = <K extends keyof WhatsappReportSchedule>(field: K, value: WhatsappReportSchedule[K]) => {
    setSchedule((prev) => (prev ? { ...prev, [field]: value } : prev));
    setSaved(false);
  };

  const toggleSection = (key: string) => {
    if (!schedule) return;
    const has = schedule.includedSections.includes(key);
    update(
      'includedSections',
      has ? schedule.includedSections.filter((s) => s !== key) : [...schedule.includedSections, key],
    );
  };

  const handleSave = async () => {
    if (!schedule) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await whatsapp.updateReportSchedule({
        enabled: schedule.enabled,
        frequency: schedule.frequency,
        deliveryTime: schedule.deliveryTime,
        timezone: schedule.timezone,
        dayOfWeek: schedule.frequency === 'WEEKLY' ? (schedule.dayOfWeek ?? 1) : null,
        dayOfMonth: schedule.frequency === 'MONTHLY' ? (schedule.dayOfMonth ?? 1) : null,
        recipientPhones: schedule.recipientPhones,
        includedSections: schedule.includedSections.length > 0 ? schedule.includedSections : ['sales_summary'],
      });
      setSchedule(res);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    setIsTestSending(true);
    setTestSendResult(null);
    setError(null);
    try {
      const res = await whatsapp.sendReportTestNow();
      const sentCount = res.results.filter((r) => r.status === 'SENT').length;
      const failedCount = res.results.length - sentCount;
      setTestSendResult(
        failedCount === 0
          ? `Sent to ${sentCount} recipient(s).`
          : `${sentCount} sent, ${failedCount} failed — see Recent Deliveries below.`,
      );
      await loadLogs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send test report');
    } finally {
      setIsTestSending(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-zinc-500 text-center py-8">Loading…</div>;
  }
  if (!schedule) {
    return <div className="text-sm text-zinc-500 text-center py-8">Unable to load schedule.</div>;
  }

  const primaryPhone = schedule.recipientPhones[0] ?? '';
  const secondaryPhone = schedule.recipientPhones[1] ?? '';
  const setPhones = (primary: string, secondary: string) => {
    update('recipientPhones', [primary.trim(), secondary.trim()].filter(Boolean));
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-zinc-700">Automated Reports</span>
        <button
          type="button"
          onClick={() => update('enabled', !schedule.enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            schedule.enabled ? 'bg-emerald-500' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              schedule.enabled ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Frequency</label>
        <select
          value={schedule.frequency}
          onChange={(e) => update('frequency', e.target.value as WhatsappReportSchedule['frequency'])}
          className={inputCls}
        >
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>

      {schedule.frequency === 'WEEKLY' && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Day of Week</label>
          <select
            value={schedule.dayOfWeek ?? 1}
            onChange={(e) => update('dayOfWeek', Number(e.target.value))}
            className={inputCls}
          >
            {WEEKDAY_LABELS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {schedule.frequency === 'MONTHLY' && (
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Day of Month</label>
          <input
            type="number" min={1} max={31}
            value={schedule.dayOfMonth ?? 1}
            onChange={(e) => update('dayOfMonth', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Time</label>
        <input
          type="time"
          value={schedule.deliveryTime}
          onChange={(e) => update('deliveryTime', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Timezone</label>
        <select
          value={schedule.timezone}
          onChange={(e) => update('timezone', e.target.value)}
          className={inputCls}
        >
          {/* Guard against the saved value not being in the list (an
              unrecognized/custom string) — otherwise the browser would
              silently fall back to the first option and the Save button
              would quietly overwrite the tenant's real timezone. */}
          {!TIMEZONE_OPTIONS.some((o) => o.value === schedule.timezone) && (
            <option value={schedule.timezone}>{schedule.timezone}</option>
          )}
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-400 mt-1">The delivery time above is interpreted in this timezone.</p>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Owner Phone</label>
        <input
          type="text"
          value={primaryPhone}
          onChange={(e) => setPhones(e.target.value, secondaryPhone)}
          placeholder="+237600000000"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Manager Phone (optional)</label>
        <input
          type="text"
          value={secondaryPhone}
          onChange={(e) => setPhones(primaryPhone, e.target.value)}
          placeholder="+237600000001"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">Included Metrics</label>
        <div className="space-y-1">
          {ALL_SECTIONS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.includedSections.includes(key)}
                onChange={() => toggleSection(key)}
              />
              {SECTION_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {saved && !error && <p className="text-xs font-semibold text-emerald-600">Saved.</p>}

      <Button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm">
        {isSaving ? 'Saving...' : 'Save Schedule'}
      </Button>

      {/* Sends immediately using the saved recipients/sections — bypasses
          both the delivery-time match and the once-per-day guard the real
          cron enforces, so testing doesn't require waiting for a tick and
          then being locked out for the rest of the day. Requires the
          schedule to already be saved (needs recipients on record) and a
          READY WhatsApp session; both failure modes surface a clear
          message rather than a silent no-op. */}
      <Button
        onClick={handleTestSend}
        disabled={isTestSending || schedule.recipientPhones.length === 0}
        variant="outline"
        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"
      >
        {isTestSending ? 'Sending…' : 'Send Test Now'}
      </Button>
      {testSendResult && <p className="text-xs font-semibold text-zinc-600">{testSendResult}</p>}

      {/* Without this, saving a schedule gave no signal at all about
          whether the cron actually ran and sent anything — confirmed real
          gap where a tenant had no way to tell besides asking someone to
          check the backend logs. Pulled from whatsapp_report_logs, one row
          per recipient per dispatch attempt. */}
      <div className="pt-3 border-t border-zinc-200/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-zinc-500">Recent Deliveries</span>
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoadingLogs}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            {isLoadingLogs ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {logsError && <p className="text-xs font-semibold text-red-600">{logsError}</p>}
        {!logsError && logs.length === 0 && (
          <p className="text-xs text-zinc-400">
            {schedule.enabled
              ? 'No deliveries yet — the next attempt happens at your scheduled time.'
              : 'No deliveries yet.'}
          </p>
        )}
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start justify-between gap-2 text-[11.5px]">
              <div className="min-w-0">
                <span className="font-semibold text-zinc-700">{log.recipientPhone}</span>
                <span className="text-zinc-400"> · {formatRelative(log.sentAt)}</span>
                {log.status === 'FAILED' && log.errorDetails && (
                  <p className="text-red-500 truncate">{log.errorDetails}</p>
                )}
              </div>
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  log.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
