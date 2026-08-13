'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { upgradeRequests } from '@/lib/superadmin-api';
import { onRealtimeEvent } from '@/lib/realtime';

const NAV_ITEMS = [
  { href: '/platform',              label: 'Overview' },
  { href: '/platform/tenants',      label: 'Tenants' },
  { href: '/platform/subscriptions',label: 'Subscriptions' },
  { href: '/platform/ops',          label: 'Platform Ops' },
  { href: '/platform/settings',     label: 'Settings' },
];

/** Live count of pending upgrade requests, shown as a badge on the
 *  "Subscriptions" nav item — seeded by one GET on mount, then kept fresh by
 *  the same real-time events the Subscriptions page itself listens for
 *  (see PendingUpgradeRequestsPanel there), so no polling is needed. */
function usePendingUpgradeRequestCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    upgradeRequests.list('PENDING')
      .then((res) => setCount(res.requests.length))
      .catch(() => {}); // Badge is informational — a failed refresh just keeps the last known count.
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => onRealtimeEvent('subscription:request_created', refresh), [refresh]);
  useEffect(() => onRealtimeEvent('subscription:request_decided', refresh), [refresh]);

  return count;
}

function PlatformNav() {
  const pathname = usePathname();
  const pendingRequestCount = usePendingUpgradeRequestCount();

  return (
    <nav className="max-w-[1400px] mx-auto px-4 sm:px-8 h-11 flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        // Exact match for the root overview page; prefix match for the rest,
        // so e.g. /platform/tenants/[id] still highlights "Tenants".
        const active = item.href === '/platform'
          ? pathname === '/platform'
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${
              active
                ? 'bg-white/95 text-[#0052ff] shadow-[0_8px_20px_-6px_rgba(0,82,255,0.12),inset_0_1px_2px_0_rgba(255,255,255,1)] border border-slate-200/50'
                : 'text-slate-500 hover:text-[#0b1e33] hover:bg-white/40 border border-transparent'
            }`}
          >
            {item.label}
            {item.href === '/platform/subscriptions' && pendingRequestCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                {pendingRequestCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, router]);

  // Loading Screen
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return null;
  }

  const isSuperadmin = user?.permissions.includes('superadmin:access');
  const isPlatformStaff = isSuperadmin
    || user?.permissions.includes('platform:support')
    || user?.permissions.includes('platform:billing');

  // Forbidden / Restricted Access View
  if (!isPlatformStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#bce3f9] via-[#e1f1fc] to-[#f4f9fd] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/95 border border-white/80 flex items-center justify-center text-red-500 mb-6 shadow-[0_12px_24px_-6px_rgba(239,68,68,0.15)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 className="text-xl font-extrabold text-[#0b1e33] tracking-tight">Platform access required</h2>
        <p className="text-[13px] text-slate-500 max-w-sm mt-2 leading-relaxed">
          This section is restricted to platform operators. Your account does not have permission to view it.
        </p>

        <button
          onClick={() => router.replace('/admin')}
          className="mt-6 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/80 border border-white/80 text-slate-600 hover:bg-white transition-all duration-200 active:scale-[0.98] shadow-sm"
        >
          Return to workspace
        </button>
      </div>
    );
  }

  // Platform console main layout — same light glass chrome as the tenant
  // console's TopBar/Sidebar (see components/{TopBar,Sidebar}.tsx), so the
  // Super Admin Command Center reads as the same product, not a bolted-on
  // dark "ops terminal".
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="
        sticky top-0 z-40
        bg-white/40 backdrop-blur-3xl
        border-b border-white/60
        shadow-[0_8px_32px_-12px_rgba(11,30,51,0.04),0_1px_0_0_rgba(255,255,255,0.4)_inset]
      ">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">

          {/* Brand + section indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-[#0052ff]/20 blur-md rounded-full animate-pulse" />
              <div className="relative w-2.5 h-6 bg-[#0052ff] rounded-full shadow-[0_0_16px_rgba(0,82,255,0.4)]" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-[#0b1e33] uppercase font-sans truncate">
              Nerva
            </span>
            <span className="h-4 w-px bg-slate-200 hidden sm:inline-block shrink-0" />
            <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#0052ff] bg-[#0052ff]/8 px-2 py-1.5 rounded-md border border-[#0052ff]/15 hidden sm:inline-block shrink-0">
              Platform Console
            </span>
          </div>

          {/* User + client-mode switcher */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <span className="text-xs font-medium text-slate-500 font-mono hidden md:block truncate max-w-[220px]">
              {user?.email}
            </span>

            <button
              onClick={() => router.replace('/admin')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200/70 bg-white/70 hover:bg-white hover:text-[#0b1e33] transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span className="hidden sm:inline">Client view</span>
            </button>

            <button
              onClick={async () => { await logout(); router.replace('/login'); }}
              title="Sign out"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50/60 border border-transparent hover:border-red-100 transition-all duration-200 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        <PlatformNav />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
