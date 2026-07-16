'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { auth as authApi } from '../../../lib/endpoints';
import { tokenStore } from '../../../lib/token-store';
import { nowTimestamptz } from '../../../lib/tenancy';
import { ApiError } from '../../../lib/api';
import type { RegisterResponse } from '../../../lib/types';

/**
 * Baseline market currencies. RWF (Rwandan Franc) is the default per the
 * product spec; the rest cover the primary East/Central-African markets.
 */
const CURRENCIES = [
  { value: 'RWF', symbol: 'FRw', label: 'Rwandan Franc' },
  { value: 'XAF', symbol: 'FCFA', label: 'Central CFA' },
  { value: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { value: 'UGX', symbol: 'USh', label: 'Ugandan Shilling' },
  { value: 'TZS', symbol: 'TSh', label: 'Tanzanian Shilling' },
  { value: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { value: 'USD', symbol: '$', label: 'US Dollar' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — account
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');

  // Step 2 — store
  const [orgName, setOrgName] = useState('');
  const [currency, setCurrency] = useState('RWF');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Per-field validation surfaced only after a step advance is attempted.
  const step1Errors = useMemo(() => {
    if (!touched) return {} as Record<string, string>;
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(ownerEmail.trim())) e.ownerEmail = 'Enter a valid email address.';
    if (password.length < 8) e.password = 'Use at least 8 characters.';
    if (!PHONE_RE.test(ownerPhone.trim())) e.ownerPhone = 'Enter a valid phone number.';
    return e;
  }, [touched, ownerEmail, password, ownerPhone]);

  const step2Valid = orgName.trim().length >= 2 && currency.length === 3;

  const goToStep2 = () => {
    setTouched(true);
    if (
      EMAIL_RE.test(ownerEmail.trim()) &&
      password.length >= 8 &&
      PHONE_RE.test(ownerPhone.trim())
    ) {
      setError(null);
      setTouched(false);
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2Valid) return;
    setError(null);
    setSubmitting(true);
    try {
      const res: RegisterResponse = await authApi.register({
        owner_email: ownerEmail.trim(),
        password,
        owner_phone_number: ownerPhone.trim(),
        organization_name: orgName.trim(),
        currency,
        client_created_at: nowTimestamptz(),
      });

      tokenStore.organizationId = res.organization_id;
      tokenStore.tenantId = res.organization_id;

      await login(ownerEmail.trim(), password);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isNotImplemented) {
          setError('Registration is not available on this environment yet. Please contact your administrator.');
        } else if (err.status === 409) {
          setError('An account already exists for that email or organization.');
        } else if (err.status === 429) {
          setError('Too many attempts. Please wait a minute and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to reach the server. Is the gateway running on :8080?');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-b from-[#bce3f9] via-[#e1f1fc] to-[#f4f9fd] selection:bg-[#0052ff]/10">
      
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

        {/* STEPPER PROGRESS */}
        <div className="mb-6 flex justify-center">
          <Stepper step={step} />
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>

          {/* HEADER */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-[#0b1e33] tracking-tight">Create your workspace</h1>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              {step === 1 
                ? 'Set up your master administrator credentials.' 
                : 'Configure your company parameters and regional currency.'
              }
            </p>
          </div>

          {/* REGISTRATION FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                <div className="space-y-4">
                  <FloatingField
                    label="Owner email"
                    type="email"
                    value={ownerEmail}
                    onChange={setOwnerEmail}
                    autoComplete="email"
                    error={step1Errors.ownerEmail}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    }
                  />

                  <FloatingField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    error={step1Errors.password}
                    hint={step1Errors.password ? undefined : 'Minimum 8 characters.'}
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

                  <FloatingField
                    label="Owner phone number"
                    type="tel"
                    value={ownerPhone}
                    onChange={setOwnerPhone}
                    autoComplete="tel"
                    error={step1Errors.ownerPhone}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    }
                  />
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="button"
                  onClick={goToStep2}
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
                    flex items-center justify-center gap-2
                    mt-6
                  "
                >
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <div className="space-y-6">
                  <FloatingField
                    label="Organization name"
                    value={orgName}
                    onChange={setOrgName}
                    autoComplete="organization"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M9 22V12h6v10"/><path d="M8 6h2"/><path d="M14 6h2"/><path d="M8 10h2"/><path d="M14 10h2"/>
                      </svg>
                    }
                  />

                  {/* HIGH-FLEXIBILITY CREATIVE CURRENCY SELECTOR */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider uppercase text-[#0052ff] px-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      Baseline Market Currency
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                      {CURRENCIES.map((opt) => {
                        const isSelected = currency === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCurrency(opt.value)}
                            className={`
                              relative flex flex-col items-start p-3.5 rounded-2xl text-left border transition-all duration-200 active:scale-[0.97]
                              ${isSelected 
                                ? 'bg-[#0052ff] border-[#0052ff] shadow-[0_8px_16px_-4px_rgba(0,82,255,0.25)] text-white' 
                                : 'bg-white/60 hover:bg-white border-slate-200/80 text-[#0b1e33] hover:border-[#0052ff]/30'
                              }
                            `}
                          >
                            <div className="flex w-full items-center justify-between mb-1">
                              <span className={`text-[13px] font-bold font-mono tracking-tight ${isSelected ? 'text-white' : 'text-[#0b1e33]'}`}>
                                {opt.value}
                              </span>
                              {opt.value === 'RWF' && (
                                <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-[#0052ff]/10 text-[#0052ff]'}`}>
                                  Default
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-medium leading-tight truncate w-full ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              {opt.symbol} · {opt.label}
                            </span>

                            {isSelected && (
                              <span className="absolute bottom-2 right-2 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono leading-relaxed px-1">
                      Applied to every price and ledger entry across your stores.
                    </p>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setError(null); setStep(1); }}
                    className="
                      px-5 py-4 
                      rounded-2xl 
                      text-xs font-mono font-bold 
                      uppercase tracking-wider 
                      text-slate-600 
                      bg-transparent 
                      border border-slate-200 
                      hover:bg-slate-50/50 
                      transition-all duration-200
                      flex items-center gap-1.5
                    "
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                    </svg>
                    Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={submitting || !step2Valid}
                    className="
                      flex-1 
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
                    "
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Initializing Node...</span>
                      </>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

        </div>

        {/* BOTTOM HELPER ROUTE */}
        <p className="text-xs font-mono text-slate-500 text-center mt-8">
          Already have a workspace?{' '}
          <Link href="/login" className="text-[#0052ff] hover:underline font-bold transition-all">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Account' },
    { n: 2, label: 'Store' },
  ];
  return (
    <div className="flex items-center gap-3 px-2">
      {steps.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-200 ${
                  done
                    ? 'bg-[#0052ff] text-white border-[#0052ff] shadow-[0_4px_10px_-3px_rgba(0,82,255,0.4)]'
                    : active
                      ? 'bg-[#0052ff]/10 text-[#0052ff] border-[#0052ff]/40 shadow-inner'
                      : 'bg-white/60 text-slate-400 border-slate-200'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${active || done ? 'text-[#0b1e33]' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={`w-12 h-px transition-colors duration-300 ${done ? 'bg-[#0052ff]/40' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="text-xs font-mono font-medium text-red-600 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
      {message}
    </div>
  );
}

interface FloatingFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

function FloatingField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  error,
  hint,
  icon,
  suffix,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative w-full">
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
            ? '-top-2 left-4 text-[10px] font-mono font-bold tracking-wider uppercase bg-white px-1.5 py-0.5 rounded-md text-[#0052ff] border border-slate-200/50' 
            : 'top-[16px] text-sm text-slate-400'
          }
        `}
      >
        {label}
      </span>

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
          border 
          rounded-2xl 
          pl-11
          ${suffix ? 'pr-11' : 'pr-4'}
          py-3.5 
          text-sm 
          text-[#0b1e33] 
          focus:bg-white
          outline-none 
          transition-all 
          duration-200
          ${error 
            ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/5' 
            : 'border-slate-200/80 focus:border-[#0052ff]/50 focus:ring-4 focus:ring-[#0052ff]/5'
          }
        `}
      />

      {suffix && (
        <div className="absolute right-4 top-[16px] flex items-center justify-center z-10">
          {suffix}
        </div>
      )}

      {/* Error or Hint Micro-text */}
      {error && (
        <p className="text-[10px] text-red-500 font-mono font-bold mt-1.5 ml-3 flex items-center gap-1">
          <span>●</span> {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-[10px] text-slate-400 font-mono mt-1.5 ml-3">
          {hint}
        </p>
      )}
    </div>
  );
}