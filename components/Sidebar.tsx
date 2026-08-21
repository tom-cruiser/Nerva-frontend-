'use client';

import React, { useEffect } from 'react';
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
    href: '/sales',
    label: 'Sales History',
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h6" />
      </svg>
    ),
    permission: 'sales:read',
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
    href: '/reports',
    label: 'Reports',
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    permission: 'reports:read',
  },
  {
    href: '/shifts',
    label: 'Shifts',
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    permission: 'shifts:read'
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
  {
    href: '/settings/seats',
    label: 'Team',
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    // GET /api/v1/auth/seats requires users:read (OWNER or MANAGER) — matches
    // who can actually see the roster; the Add-worker button inside the page
    // separately self-gates on users:create (OWNER only).
    permission: 'users:read',
  },
  {
    href: '/settings/subscription',
    label: 'Billing',
    icon: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    // GET /api/v1/auth/subscription is OWNER-only (no dedicated permission
    // type for billing — see subscription-handler.ts's inline assertOwner())
    // — reuse users:update, itself already OWNER-only per ROLE_PERMISSIONS,
    // rather than inventing a new permission string just for a nav gate.
    permission: 'users:update',
  },
];

interface SidebarProps {
  /** Mobile/tablet drawer state — ignored at the `lg` breakpoint, where the sidebar is always visible. */
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const items = NAV.filter((n) => !n.permission || hasPermission(n.permission));

  // Auto-close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Backdrop — mobile/tablet only, dismisses the drawer on tap. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0b1e33]/30 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`
        h-dvh w-64 fixed left-0 top-0
        bg-white/95 lg:bg-white/40 backdrop-blur-3xl
        border-r border-white/60
        flex flex-col py-6 z-50
        shadow-[4px_0_32px_rgba(11,30,51,0.02),1px_0_0_0_rgba(255,255,255,0.4)_inset]
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
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
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto p-2 -mr-2 rounded-xl text-slate-400 hover:text-[#0b1e33] hover:bg-white/60 transition-colors lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 space-y-1.5 px-3.5 overflow-y-auto">
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
    </>
  );
}