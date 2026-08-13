'use client';

import React from 'react';

/**
 * Shared light-theme pieces for the Super Admin Command Center
 * (app/(platform)/platform/**). Deliberately matches the rest of the app's
 * established look — bg-white/70 backdrop-blur glass panels, #0052ff as the
 * one brand accent, zinc neutrals, soft emerald/amber/red status pills — the
 * same language as app/login/page.tsx, components/{TopBar,Sidebar}.tsx, and
 * app/(app)/admin/page.tsx. Not the dark "glass/pulse" components/ui/*
 * kit — that is a separate system used elsewhere (marketing, ledgers,
 * shifts, whatsapp) and intentionally left alone here.
 */

// ─── Panels ─────────────────────────────────────────────────────────────────

export function Panel({
  children, className = '', padding = 'p-5',
}: { children: React.ReactNode; className?: string; padding?: string }) {
  return (
    <div className={`bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.08)] ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function Tile({
  children, className = '',
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/70 backdrop-blur-md border border-zinc-200/50 rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-300 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({
  label, value, sub, icon, accent = false,
}: { label: string; value: string; sub?: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <Tile>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-1.5">{label}</p>
          <p className={`text-[26px] font-extrabold tracking-tight font-mono truncate ${accent ? 'text-[#0052ff]' : 'text-[#0A0A0A]'}`}>{value}</p>
          {sub && <div className="mt-2">{sub}</div>}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-[#0052ff]/8 border border-[#0052ff]/15 flex items-center justify-center text-[#0052ff] shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Tile>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────

export type PillColor = 'blue' | 'green' | 'amber' | 'red' | 'zinc';

const PILL_CLS: Record<PillColor, string> = {
  blue:  'bg-[#0052ff]/10 text-[#0052ff] border-[#0052ff]/20',
  green: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/40',
  amber: 'bg-amber-50/80 text-amber-700 border-amber-200/40',
  red:   'bg-red-50/80 text-red-700 border-red-200/40',
  zinc:  'bg-zinc-100/80 text-zinc-500 border-zinc-200/40',
};
const DOT_CLS: Record<PillColor, string> = {
  blue: 'bg-[#0052ff]', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', zinc: 'bg-zinc-400',
};

export function Pill({
  children, color = 'zinc', dot = false, className = '',
}: { children: React.ReactNode; color?: PillColor; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${PILL_CLS[color]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLS[color]}`} />}
      {children}
    </span>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger';

const BUTTON_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-[#0052ff] text-white hover:bg-[#0041cc] shadow-[0_4px_12px_rgba(0,82,255,0.2)] disabled:shadow-none',
  ghost:   'bg-white/60 text-zinc-600 border border-zinc-200/70 hover:bg-zinc-50',
  danger:  'bg-red-50 text-red-600 border border-red-200/60 hover:bg-red-100',
};

export function AppButton({
  children, variant = 'primary', size = 'md', icon, loading = false, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: React.ReactNode; loading?: boolean;
}) {
  const sizeCls = size === 'sm' ? 'px-3 py-1.5 text-[12px] gap-1.5' : 'px-4 py-2 text-[13px] gap-2';
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-wider transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${BUTTON_CLS[variant]} ${sizeCls} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
    </button>
  );
}

// ─── Form fields ─────────────────────────────────────────────────────────────

export function LightField({
  label, value, onChange, hint, mono = false, className = '', ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string; value: string; onChange: (v: string) => void; hint?: string; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full bg-white/70 border border-zinc-200/80 rounded-xl px-3 py-2 text-[13px] text-[#0b1e33] placeholder-zinc-400 outline-none transition-all focus:bg-white focus:border-[#0052ff]/50 focus:ring-4 focus:ring-[#0052ff]/8 disabled:opacity-50 ${mono ? 'font-mono text-[12px]' : ''} ${className}`}
        {...props}
      />
      {hint && <span className="text-[11px] text-zinc-400 mt-1 block">{hint}</span>}
    </label>
  );
}

export function LightSelect({
  label, value, onChange, options, className = '', ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full bg-white/70 border border-zinc-200/80 rounded-xl px-3 py-2 text-[13px] text-[#0b1e33] outline-none transition-all focus:bg-white focus:border-[#0052ff]/50 focus:ring-4 focus:ring-[#0052ff]/8 disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ─── Notices ─────────────────────────────────────────────────────────────────

export type Notice = { kind: 'success' | 'error'; text: string };

export function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <div className={`text-[12.5px] font-medium rounded-xl px-3.5 py-2.5 border ${
      notice.kind === 'success'
        ? 'bg-emerald-50/80 border-emerald-200/50 text-emerald-700'
        : 'bg-red-50/80 border-red-200/50 text-red-700'
    }`}>
      {notice.text}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400 mb-3">
      {children}
    </h4>
  );
}

export function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-red-200/60 bg-red-50/70 text-red-600 text-[13px] px-4 py-3">
      {text}
    </div>
  );
}
