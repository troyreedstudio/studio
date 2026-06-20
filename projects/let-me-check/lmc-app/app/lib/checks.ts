// Typed check-lifecycle wrappers (CHECK-01/02/03/05/06, DISP-04).
//
// This module is the ONLY place the wired screens (Plans 04/05) touch a check.
// It holds NO business logic: every state change routes through a server-owned
// SECURITY DEFINER RPC, never a client UPDATE. Specifically (DATA-02):
//   - status changes  -> rpc('transition_check', { p_check_id, p_to })
//   - the atomic claim -> rpc('accept_check', { p_check_id })
// The client has no UPDATE policy on checks.status / checks.scout_id (migration
// 0005); those columns are reachable only through the hardened functions in
// 0007. This file must therefore NEVER UPDATE the checks table directly.
//
// Reads are RLS-scoped: a Seeker sees their own checks, a Scout additionally sees
// open (dispatching, unclaimed) + own-assigned checks (migration 0009).

import { supabase } from './supabase';
import type { Database } from './database.types';

export type CheckRow = Database['public']['Tables']['checks']['Row'];
export type ClipRow = Database['public']['Tables']['clips']['Row'];
export type CheckTier = 'standard' | 'priority';

/** Resolve the current authed user id, or throw if signed out (mirrors api.ts). */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export type CreateCheckInput = {
  tier: CheckTier;
  locationLabel: string;
  lat?: number;
  lng?: number;
  venueId?: string;
  marketId?: string;
  currency?: string;
};

/**
 * CHECK-01: a Seeker requests a check at a chosen location. INSERTs a `requested`
 * row (RLS allows insert-as-requested) then makes it discoverable to Scouts by
 * transitioning to `dispatching` (manual dispatch this phase — CHECK-02). Returns
 * the new check id.
 */
export async function createCheck(input: CreateCheckInput): Promise<string> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('checks')
    .insert({
      seeker_id: uid,
      tier: input.tier,
      status: 'requested',
      location_label: input.locationLabel,
      requested_lat: input.lat ?? null,
      requested_lng: input.lng ?? null,
      venue_id: input.venueId ?? null,
      market_id: input.marketId ?? null,
      currency: input.currency ?? 'USD',
    })
    .select('id')
    .single();
  if (error) throw error;

  // Make it discoverable to Scouts (server-owned transition).
  await supabase.rpc('transition_check', { p_check_id: data.id, p_to: 'dispatching' });
  return data.id;
}

/** Read a single check by id (RLS confines to rows the caller may see). */
export async function getCheck(checkId: string): Promise<CheckRow | null> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('id', checkId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * CHECK-03: list open checks a Scout can accept. Narrow Scout RLS (0009) exposes
 * only `dispatching` + unclaimed; this is a scoped SELECT, NOT a Realtime
 * firehose (Phase 5 makes dispatch server-driven).
 */
export async function listOpenChecks(): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('status', 'dispatching')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * CHECK-03: atomically claim an open check. The server `accept_check` does the
 * guarded first-wins UPDATE; a losing race surfaces here as a thrown error
 * (e.g. "already taken"). The client never sets scout_id itself.
 */
export async function acceptCheck(checkId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_check', { p_check_id: checkId });
  if (error) throw error;
}

/** Assigned Scout begins filming. Server-owned transition. */
export async function markFilming(checkId: string): Promise<void> {
  const { error } = await supabase.rpc('transition_check', {
    p_check_id: checkId,
    p_to: 'filming',
  });
  if (error) throw error;
}

// CHECK-05 / VID-03 (locked decision): the client CANNOT deliver a check.
// The former delivery wrapper — which inserted a stub clip then transitioned the
// check from the device — is RETIRED. Delivery is a server fact: the
// signature-verified Mux webhook (03-02) is the SOLE driver of the delivered
// state (filming -> uploaded -> processing -> delivered). The device's job ends at
// "upload PUT returned success" (lib/clips.ts). There is therefore no client-side
// delivered transition anywhere in this module.

/**
 * CHECK-06: the owning Seeker rates a delivered check. Persists to `ratings`
 * (RLS: auth.uid() = seeker_id) THEN transitions `delivered -> rated`. Stars are
 * validated 1..5 at this boundary before any write.
 */
export async function rateCheck(checkId: string, stars: number): Promise<void> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('rateCheck: stars must be an integer between 1 and 5');
  }
  const uid = await requireUserId();
  const { error: rateError } = await supabase
    .from('ratings')
    .insert({ check_id: checkId, seeker_id: uid, stars });
  if (rateError) throw rateError;

  const { error } = await supabase.rpc('transition_check', {
    p_check_id: checkId,
    p_to: 'rated',
  });
  if (error) throw error;
}

/** The owning Seeker cancels a requested/dispatching check. Server-owned. */
export async function cancelCheck(checkId: string): Promise<void> {
  const { error } = await supabase.rpc('transition_check', {
    p_check_id: checkId,
    p_to: 'cancelled',
  });
  if (error) throw error;
}

/**
 * Read the delivered clip metadata for a check (when/where filmed). Consumed by
 * the Seeker delivery screen (Wave 4). Returns null until a clip exists. RLS
 * (0009) confines clips to the check's seeker or assigned scout.
 */
export async function getCheckClip(checkId: string): Promise<ClipRow | null> {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('check_id', checkId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
