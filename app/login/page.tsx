'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { tokenStore } from '../../lib/token-store';
import { ApiError } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();

  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill the last tenant id and bounce already-authenticated users.
  useEffect(() => {
    setTenantId(tokenStore.tenantId ?? '');
  }, []);
  useEffect(() => {
    if (status === 'authenticated') router.replace('/admin');
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(tenantId.trim(), email.trim(), password);
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : err.message,
        );
      } else {
        setError('Unable to reach the server. Is the gateway running on :8080?');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0C0E] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pulse pulse-dot" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Nerva</h1>
          </div>
          <p className="text-[13px] text-zinc-500 mt-2">Sign in to your workspace</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass rounded-xl2 p-6 space-y-4"
        >
          <Field
            label="Tenant ID"
            value={tenantId}
            onChange={setTenantId}
            placeholder="00000000-0000-0000-0000-000000000000"
            mono
            autoComplete="organization"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@store.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !tenantId || !email || !password}
            className="w-full bg-pulse text-[#0C0C0E] font-semibold rounded-lg py-2.5 text-[14px] hover:bg-pulse-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-[12px] text-zinc-600 text-center mt-6">
          New to Nerva?{' '}
          <Link href="/auth/register" className="text-pulse hover:text-pulse-hover font-medium">
            Create a workspace
          </Link>
        </p>
        <p className="text-[11px] text-zinc-600 text-center mt-2">
          Your tenant admin can provide your Tenant ID.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1.5 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[14px] text-zinc-100 placeholder-zinc-600 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20 outline-none transition-all ${
          mono ? 'font-mono text-[12px]' : ''
        }`}
      />
    </label>
  );
}
