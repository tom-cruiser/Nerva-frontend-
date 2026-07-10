'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field, Select } from '../../../components/ui';
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
  { value: 'RWF', label: 'RWF · Rwandan Franc' },
  { value: 'XAF', label: 'XAF · Central African CFA' },
  { value: 'KES', label: 'KES · Kenyan Shilling' },
  { value: 'UGX', label: 'UGX · Ugandan Shilling' },
  { value: 'TZS', label: 'TZS · Tanzanian Shilling' },
  { value: 'NGN', label: 'NGN · Nigerian Naira' },
  { value: 'USD', label: 'USD · US Dollar' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — account
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
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
        // timestamptz anchor — idempotency + LWW baseline for the create.
        client_created_at: nowTimestamptz(),
      });

      // Inject the returned organization_id as the global data-isolation
      // boundary for the offline-first WatermelonDB client.
      tokenStore.organizationId = res.organization_id;
      tokenStore.tenantId = res.organization_id;

      // Auto-login when the backend issues a session on registration…
      if (res.accessToken && res.refreshToken && res.owner) {
        tokenStore.save({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.owner,
        });
        router.replace('/dashboard/settings/seats');
      } else {
        // …otherwise send the owner to sign in (tenant id is prefilled).
        router.replace('/login');
      }
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
    <div className="min-h-screen flex items-center justify-center bg-[#0C0C0E] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pulse pulse-dot" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Nerva</h1>
          </div>
          <p className="text-[13px] text-zinc-500 mt-2">Create your retail workspace</p>
        </div>

        <Stepper step={step} />

        <form onSubmit={handleSubmit} className="glass rounded-xl2 p-6 space-y-4 mt-4">
          {step === 1 ? (
            <>
              <Field
                label="Owner email"
                type="email"
                value={ownerEmail}
                onChange={setOwnerEmail}
                placeholder="owner@store.com"
                autoComplete="email"
                error={step1Errors.ownerEmail}
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="new-password"
                error={step1Errors.password}
                hint={step1Errors.password ? undefined : 'Minimum 8 characters.'}
              />
              <Field
                label="Owner phone number"
                type="tel"
                value={ownerPhone}
                onChange={setOwnerPhone}
                placeholder="+250 7xx xxx xxx"
                autoComplete="tel"
                error={step1Errors.ownerPhone}
              />

              {error && <ErrorBanner message={error} />}

              <button
                type="button"
                onClick={goToStep2}
                className="w-full bg-pulse text-[#0C0C0E] font-semibold rounded-lg py-2.5 text-[14px] hover:bg-pulse-hover transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </>
          ) : (
            <>
              <Field
                label="Organization name"
                value={orgName}
                onChange={setOrgName}
                placeholder="Kigali Corner Store"
                autoComplete="organization"
              />
              <Select
                label="Baseline market currency"
                value={currency}
                onChange={setCurrency}
                options={CURRENCIES}
                hint="Applied to every price and ledger entry across your stores."
              />

              {error && <ErrorBanner message={error} />}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => { setError(null); setStep(1); }}
                  className="px-4 py-2.5 rounded-lg text-[14px] font-semibold text-zinc-300 bg-transparent border border-white/8 hover:bg-white/6 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !step2Valid}
                  className="flex-1 bg-pulse text-[#0C0C0E] font-semibold rounded-lg py-2.5 text-[14px] hover:bg-pulse-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitting ? 'Creating workspace…' : 'Create workspace'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-[12px] text-zinc-600 text-center mt-6">
          Already have a workspace?{' '}
          <Link href="/login" className="text-pulse hover:text-pulse-hover font-medium">
            Sign in
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
    <div className="flex items-center gap-3 px-1">
      {steps.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors ${
                  done
                    ? 'bg-pulse text-[#0C0C0E] border-pulse'
                    : active
                      ? 'bg-pulse/10 text-pulse border-pulse/40'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-700'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              <span className={`text-[12px] font-medium ${active || done ? 'text-zinc-200' : 'text-zinc-600'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={`flex-1 h-px ${done ? 'bg-pulse/40' : 'bg-zinc-800'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
      {message}
    </div>
  );
}
