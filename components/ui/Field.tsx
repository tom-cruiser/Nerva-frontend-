'use client';
import React from 'react';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  hint?: string;
  /** Inline validation message; renders the field in an error state when set. */
  error?: string | null;
}

/**
 * Dark labeled text input for the register / seat flows. Mirrors the field
 * styling on the login page so every auth surface reads as one system.
 */
export default function Field({
  label,
  value,
  onChange,
  mono,
  hint,
  error,
  className = '',
  ...props
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={`mt-1.5 w-full bg-zinc-900 border rounded-lg px-3 py-2 text-[14px] text-zinc-100 placeholder-zinc-600 outline-none transition-all
          ${error
            ? 'border-red-500/60 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20'
            : 'border-zinc-700 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20'}
          ${mono ? 'font-mono text-[12px]' : ''} ${className}`}
        {...props}
      />
      {error
        ? <span className="text-[11px] text-red-400 mt-1 block">{error}</span>
        : hint
          ? <span className="text-[11px] text-zinc-600 mt-1 block">{hint}</span>
          : null}
    </label>
  );
}
