'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';
import type { Permission } from '../lib/types';

interface NavItem {
  href: string;
  label: string;
  /** Inline SVG Component to guarantee perfect rendering with no external font dependencies */
  icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** Show only if the user holds this permission (undefined = always). */
  permission?: Permission;
}

const NAV: NavItem[] = [
  { 
    href: '/admin', 
    label: 'Dashboard', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    )
  },
  { 
    href: '/pos', 
    label: 'Point of Sale', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <path d="M12 7h.01M10 11h4M10 7h.01" />
      </svg>
    ), 
    permission: 'sales:create' 
  },
  { 
    href: '/inventory', 
    label: 'Inventory', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
      </svg>
    ), 
    permission: 'inventory:read' 
  },
  { 
    href: '/ledgers', 
    label: 'Ledgers', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <path d="M7 10h2M7 14h2M15 10h2M15 14h2" />
      </svg>
    ), 
    permission: 'ledger:read' 
  },
  { 
    href: '/shifts', 
    label: 'Shifts', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ) 
  },
  { 
    href: '/whatsapp', 
    label: 'WhatsApp', 
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ), 
    permission: 'whatsapp:send' 
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const items = NAV.filter((n) => !n.permission || hasPermission(n.permission));

  return (
    <aside className="
      h-screen w-64 fixed left-0 top-0 
      bg-white/40 backdrop-blur-3xl 
      border-r border-white/60 
      flex flex-col py-6 z-50 
      shadow-[4px_0_32px_rgba(11,30,51,0.02),1px_0_0_0_rgba(255,255,255,0.4)_inset]
    ">
      {/* BRANDING HEADER */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          {/* Subtle radiating pulse behind the logo bar */}
          <div className="absolute inset-0 bg-[#0052ff]/20 blur-md rounded-full animate-pulse" />
          <div className="relative w-2.5 h-7 bg-[#0052ff] rounded-full shadow-[0_0_16px_rgba(0,82,255,0.4)]" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-[#0b1e33] uppercase font-sans">
          Nerva
        </span>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="flex-1 space-y-1.5 px-3.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]
                ${active
                  ? 'bg-white/95 text-[#0052ff] shadow-[0_8px_20px_-6px_rgba(0,82,255,0.12),inset_0_1px_2px_0_rgba(255,255,255,1)] border border-slate-200/50'
                  : 'text-slate-500 hover:text-[#0b1e33] hover:bg-white/40 border border-transparent'
                }
              `}
            >
              {/* Active Marker Line */}
              {active && (
                <span className="absolute left-0 top-1/3 bottom-1/3 w-1 bg-[#0052ff] rounded-r-full" />
              )}
              
              {/* Responsive, lightweight inline SVG */}
              <IconComponent className={`
                w-[18px] h-[18px] transition-colors duration-200
                ${active ? 'text-[#0052ff]' : 'text-slate-400 group-hover:text-slate-600'}
              `} />
              
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER USER STATUS CARD */}
      <div className="px-4 mt-auto">
        <div className="
          p-4 
          bg-white/80 
          backdrop-blur-md 
          border border-white/80 
          rounded-3xl 
          shadow-[0_12px_24px_-8px_rgba(11,30,51,0.04),inset_0_2px_4px_0_rgba(255,255,255,0.6)]
        ">
          <p className="text-[9px] font-mono font-bold text-slate-400 tracking-wider uppercase mb-3">
            Active Session
          </p>
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </div>
            <span className="text-xs font-bold text-[#0b1e33] tracking-tight truncate max-w-[110px]">
              {user?.role ?? 'GUEST'}
            </span>
            <span className="ml-auto text-[9px] font-mono font-bold text-slate-400/80 bg-slate-100/80 px-1.5 py-0.5 rounded-md border border-slate-200/30">
              v2.8.1
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}