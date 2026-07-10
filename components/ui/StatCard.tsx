import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;   // positive = up, negative = down
  icon?: React.ReactNode;
  accent?: boolean;  // teal accent number
  className?: string; // used for stagger delay
}

export default function StatCard({ label, value, sub, trend, icon, accent = false, className = '' }: StatCardProps) {
  return (
    <div className={`glass rounded-xl2 p-5 flex flex-col gap-3 hover:border-pulse/50 transition-colors duration-200 fade-up ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-semibold text-zinc-400 tracking-wider uppercase">{label}</span>
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-pulse/10 border border-pulse/20 flex items-center justify-center text-pulse shadow-[0_0_10px_rgba(45,212,191,0.2)]">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2 mt-1">
        <span className={`font-black text-[32px] leading-none tracking-tight ${accent ? 'text-pulse drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]' : 'text-white'}`}>
          {value}
        </span>
        {trend !== undefined && (
          <span className={`text-[12px] font-bold mb-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {sub && <span className="text-[12.5px] text-zinc-500 font-medium">{sub}</span>}
    </div>
  );
}
