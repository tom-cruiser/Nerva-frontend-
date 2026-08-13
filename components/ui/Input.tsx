'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  dark?: boolean;
  /** Field-level validation message. When set, shows a red border + inline
   *  text below the field (same visual pattern already used ad hoc in
   *  components/ledgers/PaymentFormModal.tsx). Omit for no change at all. */
  error?: string;
}

export default function Input({ icon, dark = false, error, className = '', ...props }: InputProps) {
  return (
    <div>
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-zinc-400 pointer-events-none">{icon}</span>
        )}
        <input
          aria-invalid={!!error}
          className={`
            w-full rounded-lg border text-[14px] outline-none transition-all duration-150
            focus:ring-2 focus:ring-pulse/30 focus:border-pulse/50
            placeholder:text-zinc-500
            ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2
            ${dark
              ? 'bg-zinc-900 border-zinc-700 text-white'
              : 'bg-white border-muted text-ink'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
