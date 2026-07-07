"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StoreSwitcher from './StoreSwitcher';
import RoleGate from './RoleGate';

const MENU = [
  { href: '/', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/ledgers', label: 'Ledgers' },
  { href: '/shifts', label: 'Shifts' },
  { href: '/superadmin', label: 'Superadmin' },
];

export default function Sidebar() {
  const pathname = usePathname() || '/';

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-8 border-b divider">
        <h2 className="text-xl font-semibold">Nerva</h2>
        <div className="mt-4">
          <StoreSwitcher />
        </div>
      </div>

      <nav className="flex-1 px-2 py-6">
        {MENU.map((m) => {
          const active = pathname === m.href || pathname.startsWith(m.href + '/');
          return (
            <Link key={m.href} href={m.href} className={`block rounded-md px-3 py-2 mb-1 ${active ? 'bg-[rgba(45,212,191,0.12)] text-pulse' : 'text-white/80 hover:bg-white/5'}`}>
              {m.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t divider">
        <RoleGate>
          <div className="text-xs text-white/60">Signed in</div>
        </RoleGate>
      </div>
    </div>
  );
}
