'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Bounce already-authenticated users.
  useEffect(() => {
    if (status === 'authenticated') router.replace('/admin');
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed.';
      setError(
        /invalid login credentials/i.test(message)
          ? 'Incorrect email or password.'
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-[#bce3f9] via-[#e1f1fc] to-[#f4f9fd] selection:bg-[#0052ff]/10">
      
      {/* RADIATING CIRCULAR LAYERS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full border border-white/30" />
        <div className="absolute w-[900px] h-[900px] rounded-full border border-white/20" />
        <div className="absolute w-[1200px] h-[1200px] rounded-full border border-white/10" />
      </div>

      {/* AMBIENT CLOUD BASE */}
      <div className="absolute bottom-0 left-0 right-0 h-[35vh] bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        
        {/* BACK TO HOME LINK */}
        <div className="mb-6 flex justify-center">
          <Link href="/" className="group flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500/80 hover:text-[#0052ff] transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:-translate-x-0.5">
              <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
            </svg>
            Back to home
          </Link>
        </div>

        {/* MIRRORED GLASS CARD CONTAINER */}
        <div className="
          bg-white/40 
          backdrop-blur-3xl 
          rounded-[2.5rem] 
          p-10 
          border border-white/60 
          shadow-[0_32px_64px_-16px_rgba(11,30,51,0.08),0_16px_32px_-12px_rgba(0,82,255,0.05),inset_0_2px_4px_0_rgba(255,255,255,0.6)]
        ">
          
          {/* FLOATING ICON BOX */}
          <div className="flex justify-center mb-6">
            <div className="
              w-14 h-14 
              rounded-2xl 
              bg-white/95 
              flex items-center justify-center 
              border border-white/80 
              shadow-[0_12px_24px_-6px_rgba(0,82,255,0.12),inset_0_1px_2px_0_rgba(255,255,255,1)]
              text-[#0b1e33]
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>
              </svg>
            </div>
          </div>

          {/* HEADER */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-[#0b1e33] tracking-tight">Sign in with email</h1>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              Connect to your sync terminal to access your workspace and offline engines.
            </p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* EMAIL FIELD WITH FLOATING LABEL & INLINE SVG */}
            <FloatingField
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              }
            />
            
            {/* PASSWORD FIELD WITH FLOATING LABEL & INLINE SVG */}
            <FloatingField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center justify-center text-slate-400 hover:text-[#0052ff] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              }
            />

            {/* FORGOT PASSWORD */}
            <div className="flex justify-end pt-1">
              <Link href="#" className="text-xs font-semibold text-slate-500 hover:text-[#0052ff] transition-colors">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="text-xs font-mono font-medium text-red-600 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* PRIMARY BUTTON */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="
                w-full 
                bg-[#0b1e33] 
                text-white 
                font-bold 
                rounded-2xl 
                py-4 
                text-[13px] 
                uppercase 
                tracking-wider
                shadow-[0_12px_24px_-8px_rgba(11,30,51,0.5)] 
                hover:bg-slate-800 
                transition-all duration-200 
                hover:scale-[1.01]
                disabled:opacity-40 
                disabled:scale-100 
                disabled:hover:scale-100
                disabled:cursor-not-allowed 
                disabled:bg-[#0b1e33]
                flex items-center justify-center gap-2
                mt-6
              "
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Configuring Session...</span>
                </>
              ) : (
                <span>Access Workspace</span>
              )}
            </button>
          </form>

        </div>

        {/* BOTTOM HELPER ROUTE */}
        <p className="text-xs font-mono text-slate-500 text-center mt-8">
          Don't have a node configured?{' '}
          <Link href="/auth/register" className="text-[#0052ff] hover:underline font-bold transition-all">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}

interface FloatingFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

function FloatingField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  icon,
  suffix,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  
  // The label floats up if the input is focused OR has a value in it
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative w-full">
      
      {/* Icon integration */}
      {icon && (
        <div className="absolute left-4 top-[17px] text-slate-400 pointer-events-none z-10 flex items-center justify-center">
          {icon}
        </div>
      )}

      {/* Floating Dynamic Label */}
      <span
        className={`
          absolute 
          left-11 
          pointer-events-none 
          transition-all 
          duration-200 
          ease-out 
          z-10
          ${isFloating 
            ? '-top-2 left-4 text-[10px] font-mono font-bold tracking-wider uppercase bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-md text-[#0052ff] border border-slate-200/50' 
            : 'top-[16px] text-sm text-slate-400'
          }
        `}
      >
        {label}
      </span>

      {/* Text Input Field */}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full 
          bg-white/60 
          border border-slate-200/80 
          rounded-2xl 
          pl-11
          ${suffix ? 'pr-11' : 'pr-4'}
          py-3.5 
          text-sm 
          text-[#0b1e33] 
          focus:bg-white
          focus:border-[#0052ff]/50 
          focus:ring-4 
          focus:ring-[#0052ff]/5 
          outline-none 
          transition-all 
          duration-200
        `}
      />

      {/* Interactive Suffix (e.g., show/hide password toggle) */}
      {suffix && (
        <div className="absolute right-4 top-[16px] flex items-center justify-center z-10">
          {suffix}
        </div>
      )}
    </div>
  );
}