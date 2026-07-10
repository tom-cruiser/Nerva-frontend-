'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  dark?: boolean;
}

export default function Input({ icon, dark = false, className = '', ...props }: InputProps) {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="absolute left-3 text-zinc-400 pointer-events-none">{icon}</span>
      )}
      <input
        className={`
          w-full rounded-lg border text-[14px] outline-none transition-all duration-150
          focus:ring-2 focus:ring-pulse/30 focus:border-pulse/50
          placeholder:text-zinc-500
          ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2
          ${dark
            ? 'bg-zinc-900 border-zinc-700 text-white'
            : 'bg-white border-muted text-ink'}
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
