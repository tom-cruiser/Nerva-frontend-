'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, router]);

  // Loading Screen
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0C0C0E]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return null;
  }

  const isSuperadmin = user?.permissions.includes('superadmin:access');

  // Forbidden / Restricted Access View
  if (!isSuperadmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0C0C0E] text-zinc-100 px-4 text-center">
        {/* Glow-enhanced security shield SVG */}
        <div className="
          w-16 h-16 rounded-2xl 
          bg-red-500/10 border border-red-500/20 
          flex items-center justify-center text-red-500 mb-6
          shadow-[0_8px_24px_rgba(239,68,68,0.15)]
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        
        <h2 className="text-xl font-extrabold text-white tracking-tight">Superadmin Access Required</h2>
        <p className="text-[13px] text-slate-400 max-w-sm mt-2 leading-relaxed">
          This section is restricted to global platform operators. Your current account does not have permission to view it.
        </p>
        
        <button
          onClick={() => router.replace('/admin')}
          className="
            mt-6 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider
            bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white
            transition-all duration-200 active:scale-[0.98]
          "
        >
          Return to Console
        </button>
      </div>
    );
  }

  // Superadmin Console Main Layout
  return (
    <div className="min-h-screen bg-[#0C0C0E] text-zinc-100 flex flex-col">
      <header className="
        sticky top-0 z-40 h-16
        bg-[#0C0C0E]/70 backdrop-blur-3xl 
        border-b border-white/5 
        shadow-[0_4px_20px_rgba(0,0,0,0.4)]
      ">
        <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
          
          {/* Brand/Console indicators */}
          <div className="flex items-center gap-3.5">
            <span className="w-2.5 h-6 bg-red-600 rounded-md shadow-[0_0_16px_rgba(220,38,38,0.5)]"></span>
            <span className="text-sm font-extrabold tracking-tight text-white uppercase font-sans">
              NERVA SYSTEM OPERATOR
            </span>
            <span className="h-4 w-px bg-white/10"></span>
            <span className="
              text-[9px] font-mono font-bold tracking-widest text-red-500 
              bg-red-500/5 px-2 py-1.5 rounded-md border border-red-500/10
            ">
              Superadmin Console
            </span>
          </div>

          {/* User Details & Client Mode Switcher */}
          <div className="flex items-center gap-5">
            <span className="text-xs font-medium text-slate-400 font-mono hidden sm:block">
              {user?.email}
            </span>
            
            <button
              onClick={() => router.replace('/admin')}
              className="
                flex items-center gap-2 px-3.5 py-1.5 rounded-xl
                text-xs font-bold text-slate-300 border border-white/10 bg-white/5
                hover:text-white hover:bg-white/10 transition-all duration-200
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Client View
            </button>
          </div>
          
        </div>
      </header>
      <main className="flex-1 bg-[#0C0C0E]">{children}</main>
    </div>
  );
}