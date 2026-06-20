// Vitest setup for LMC (Wave 0).
//
// No top-level side effects: this file only exports helpers and reads env lazily.
// Integration tests import `makeClient` to talk to a real/local Supabase project.
// Unit tests that mock Supabase never need this.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Public Supabase project URL (anon-safe). Set per environment, never committed. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
/** Public anon key (RLS-protected, anon-safe). Never ship the service-role key here. */
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when integration tests can run (a Supabase target is configured).
 * Use to gate `describe.skipIf(!hasSupabaseEnv())` so unit suites stay green
 * without a live database.
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Build a Supabase client for integration tests.
 * Pass an explicit url/key (e.g. a per-test anon or service key) or fall back
 * to the configured env values.
 */
export function makeClient(
  url: string = SUPABASE_URL,
  key: string = SUPABASE_ANON_KEY,
): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      'makeClient: missing Supabase url/key. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY, or pass them explicitly.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
