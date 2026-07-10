'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';
import type { Permission } from '../lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Show only if the user holds this permission (undefined = always). */
  permission?: Permission;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/pos', label: 'Point of Sale', icon: 'point_of_sale', permission: 'sales:create' },
  { href: '/inventory', label: 'Inventory', icon: 'inventory_2', permission: 'inventory:read' },
  { href: '/ledgers', label: 'Ledgers', icon: 'account_balance_wallet', permission: 'ledger:read' },
  { href: '/shifts', label: 'Shifts', icon: 'schedule' },
  { href: '/whatsapp', label: 'WhatsApp', icon: 'message', permission: 'whatsapp:send' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const items = NAV.filter((n) => !n.permission || hasPermission(n.permission));

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white/80 backdrop-blur-xl border-r border-zinc-200/40 flex flex-col py-5 z-50 shadow-[4px_0_30px_rgba(0,0,0,0.02)]">
      <div className="px-6 mb-7 flex items-center gap-2.5">
        <div className="w-2.5 h-7 bg-[#0052ff] rounded-sm shadow-[0_0_16px_rgba(0,82,255,0.3)]"></div>
        <span className="text-2xl font-extrabold tracking-tight text-zinc-900 uppercase">
          Nerva
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider ${
                active
                  ? 'nav-item-active font-bold'
                  : 'text-zinc-500 nav-item font-semibold'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-auto">
        <div className="p-4 bg-zinc-50/70 border border-zinc-200/40 rounded-2xl shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase mb-2.5">
            Signed in as
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
            <span className="text-xs font-bold text-zinc-700 tracking-tight truncate">
              {user?.role ?? 'GUEST'}
            </span>
            <span className="ml-auto text-[10px] font-mono text-zinc-400">v2.8.1</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
