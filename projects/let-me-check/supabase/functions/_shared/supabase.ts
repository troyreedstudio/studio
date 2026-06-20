// supabase/functions/_shared/supabase.ts
// LMC Phase 3 — two Supabase client factories for the Edge Functions:
//   serviceClient()  — service-role (bypasses RLS, auth.uid() NULL). The webhook
//                      uses this to finalize the clip row and drive transition_check
//                      as the system actor (0010's service-actor allowance).
//   authedClient(req)— carries the CALLER's Authorization bearer so RLS + auth.uid()
//                      apply. Used by mux-upload-url + mux-playback-token to resolve
//                      and authorize the caller (assigned scout / owning seeker).
//
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by Supabase into every Edge
// Function; the anon key is needed only to bootstrap the authed client below.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required Supabase env: ${name}`);
  return v;
}

/** Service-role client — bypasses RLS. ONLY for the webhook (system actor). */
export function serviceClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client carrying the caller's bearer token so RLS + auth.uid() apply. The caller's
 * Authorization header is forwarded verbatim; auth.getUser() then resolves identity.
 */
export function authedClient(req: Request): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
