'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../context/AuthContext';

/**
 * Authenticated dark-surface shell for account settings (/dashboard/*).
 * Distinct from the light operational console shell — settings live on the
 * same premium dark aesthetic as login/register.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0C0C0E] text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-[#0C0C0E]/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pulse pulse-dot" />
              <span className="text-[15px] font-bold text-white tracking-tight">Nerva</span>
              <span className="text-zinc-700 mx-1">/</span>
              <span className="text-[13px] text-zinc-400 font-medium">Settings</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-[12px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
                Console
              </Link>
              <span className="w-px h-4 bg-zinc-800" />
              <span className="text-[12px] text-zinc-500 hidden sm:inline truncate max-w-[180px]">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-[12px] font-medium text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
