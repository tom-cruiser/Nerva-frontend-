'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../app/context/AuthContext';

export default function TopBar({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (v: string) => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = (user?.email ?? '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center h-16 px-8 bg-white/80 backdrop-blur-xl border-b border-zinc-200/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-zinc-500">Nerva</span>
        <span className="h-4 w-px bg-zinc-300/60"></span>
        <span className="text-[11px] font-mono text-zinc-400 font-medium">core: 1.2.4</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0052ff] text-lg transition-colors">search</span>
          <input
            className="bg-zinc-100/60 border border-zinc-200/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-700 placeholder-zinc-400 focus:ring-2 focus:ring-[#0052ff]/20 focus:border-[#0052ff] transition-all w-64 outline-none font-medium shadow-inner"
            placeholder="Search products, sales…"
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 pl-5 border-l border-zinc-200/60">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-zinc-800 tracking-tight">{user?.email ?? 'Not signed in'}</p>
            <p className="text-[10px] font-mono text-[#0052ff] font-bold tracking-widest uppercase">
              {user?.role ?? 'GUEST'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0052ff]/10 border border-[#0052ff]/20 flex items-center justify-center text-[11px] font-bold text-[#0052ff]">
            {initials}
          </div>
          {user && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-zinc-400 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
