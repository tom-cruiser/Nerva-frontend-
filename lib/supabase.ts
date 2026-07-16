'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client.
 *
 * Auth is delegated to Supabase: the client signs the user in, persists the
 * session in localStorage, and auto-refreshes the access token. Every backend
 * call carries that Supabase access token as a Bearer (see lib/api.ts); the
 * backend verifies it against the Supabase JWKS endpoint.
 *
 * Only the PUBLISHABLE (anon) key belongs here — never the secret key.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Surface misconfiguration loudly at module load rather than as a confusing
  // "Invalid API key" at first sign-in.
  throw new Error(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Add them to .env.local (see .env.example).',
  );
}

export const supabase: SupabaseClient = createClient(url, publishableKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});
