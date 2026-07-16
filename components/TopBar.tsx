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
    <header className="
      sticky top-0 z-40 
      flex justify-between items-center h-16 px-8 
      bg-white/40 backdrop-blur-3xl 
      border-b border-white/60 
      shadow-[0_8px_32px_-12px_rgba(11,30,51,0.04),0_1px_0_0_rgba(255,255,255,0.4)_inset]
    ">
      {/* LEFT: BRAND SUB-TAG & CORE VERSION */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-slate-400">
          Nerva
        </span>
        <span className="h-3.5 w-px bg-slate-200" />
        <span className="text-[10px] font-mono text-[#0052ff] font-bold bg-[#0052ff]/5 px-2.5 py-1 rounded-md border border-[#0052ff]/10">
          core: 1.2.4
        </span>
      </div>

      {/* RIGHT: SEARCH & USER ACTIONS */}
      <div className="flex items-center gap-6">
        
        {/* SPACIOUS GLASS SEARCH BAR */}
        <div className="relative group w-72">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0052ff] transition-colors pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
          </div>
          <input
            className="
              w-full
              bg-white/60 
              border border-slate-200/85 
              rounded-2xl 
              pl-10 pr-4 py-2.5 
              text-xs 
              text-[#0b1e33] 
              placeholder-slate-400 
              outline-none 
              font-medium
              transition-all duration-200
              focus:bg-white
              focus:border-[#0052ff]/40 
              focus:ring-4 focus:ring-[#0052ff]/5
              shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]
            "
            placeholder="Search products, sales…"
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* PROFILE & LOGOUT SECTION */}
        <div className="flex items-center gap-4 pl-5 border-l border-slate-200/60">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#0b1e33] tracking-tight">
              {user?.email ?? 'Not signed in'}
            </p>
            <p className="text-[10px] font-mono text-[#0052ff] font-bold tracking-widest uppercase mt-0.5">
              {user?.role ?? 'GUEST'}
            </p>
          </div>

          {/* LARGE AVATAR BADGE */}
          <div className="
            w-10 h-10 
            rounded-2xl 
            bg-[#0052ff]/10 
            border border-[#0052ff]/20 
            flex items-center justify-center 
            text-xs font-mono font-bold text-[#0052ff]
            shadow-[0_4px_12px_-4px_rgba(0,82,255,0.2)]
            shrink-0
          ">
            {initials}
          </div>

          {/* INTERACTIVE LOGOUT BUTTON */}
          {user && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="
                p-2
                rounded-2xl
                text-slate-400 hover:text-red-500 
                hover:bg-red-50/50 hover:border-red-100 border border-transparent
                transition-all duration-200
                active:scale-95
                shrink-0
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" x2="9" y1="12" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}