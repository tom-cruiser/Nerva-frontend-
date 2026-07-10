'use client';
import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantCls: Record<Variant, string> = {
  primary: 'bg-pulse text-[#0C0C0E] hover:bg-[#26bfa8] font-semibold shadow-sm',
  ghost:   'bg-transparent text-zinc-300 hover:bg-white/6 border border-white/8',
  danger:  'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  outline: 'bg-transparent text-ink border border-muted hover:bg-black/4',
};

const sizeCls: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[13px] gap-1.5',
  md: 'px-4 py-2   text-[14px] gap-2',
  lg: 'px-5 py-2.5 text-[15px] gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size    = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantCls[variant]} ${sizeCls[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
    </button>
  );
}
