import React from 'react';

type Color = 'teal' | 'green' | 'amber' | 'red' | 'zinc' | 'blue';

const colorCls: Record<Color, string> = {
  teal: 'bg-pulse/10 text-pulse border-pulse/30 shadow-[0_0_10px_rgba(45,212,191,0.1)]',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  red: 'bg-red-500/10 text-red-500 border-red-500/30',
  zinc: 'bg-zinc-800/50 text-zinc-300 border-zinc-700',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

export default function Badge({
  children,
  color = 'zinc',
  dot = false,
}: {
  children: React.ReactNode;
  color?: Color;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${colorCls[color]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${color === 'teal' ? 'bg-pulse' :
          color === 'green' ? 'bg-emerald-400' :
            color === 'amber' ? 'bg-amber-400' :
              color === 'red' ? 'bg-red-500' :
                color === 'blue' ? 'bg-blue-400' : 'bg-zinc-400'
          }`} />
      )}
      {children}
    </span>
  );
}
