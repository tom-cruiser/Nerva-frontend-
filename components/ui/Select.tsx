'use client';
import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  hint?: string;
}

/** Dark labeled dropdown matching the register / seat form fields. */
export default function Select({
  label,
  value,
  onChange,
  options,
  hint,
  className = '',
  ...props
}: SelectProps) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-zinc-400">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-9 py-2 text-[14px] text-zinc-100 outline-none transition-all focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20 ${className}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-zinc-900 text-zinc-100">
              {o.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined text-lg text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          expand_more
        </span>
      </div>
      {hint && <span className="text-[11px] text-zinc-600 mt-1 block">{hint}</span>}
    </label>
  );
}
