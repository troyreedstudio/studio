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
  /** The authorized PaymentIntent id from createPaymentHold — MUST be stored so
   *  capture-on-delivery (mux-webhook → stripe-capture) can find the hold. */
  paymentIntentId?: string;
};

/**
 * CHECK-01: a Seeker requests a check at a chosen location. INSERTs a `requested`
 * row (RLS allows insert-as-requested) then makes it discoverable to Scouts by
 * transitioning to `dispatching` (manual dispatch this phase — CHECK-02). Returns
 * the new check id.
 *
 * Phase 5 additions:
 *   - SAFE-01: blocks coords inside a no_film_zone (hospitals, schools, courts,
 *     police, residences). Client-side guard; the authoritative server enforcement
 *     is the `is_in_no_film_zone` helper (Plan 01). A follow-up can move this
 *     check fully server-side into a createCheck RPC if the client guard is
 *     insufficient. (Noted in 05-05-SUMMARY.md.)
 *   - coord: populates `checks.coord geography(point,4326)` (lng FIRST — Pitfall 1)
 *     so dispatch (DISP-01 / list_open_checks_for_scout) and verify-clip (VER-01)
 *     have a spatial index-assisted geometry to work with. requested_lat/lng
 *     remain the source of truth; coord is derived from them.
 *     If the live push rejects the WKT geography insert, the 0012 backfill +
 *     a follow-up trigger cover it — requested_lat/lng are preserved. (SUMMARY note.)
 */
export async function createCheck(input: CreateCheckInput): Promise<string> {
  const uid = await requireUserId();

  // SAFE-01: block requests whose coords fall inside a no_film_zone.
  // This is the client-side guard; the authoritative check is the server-side
  // PostGIS polygon query in `is_in_no_film_zone` (migration 0012).
  if (input.lat !== undefined && input.lng !== undefined) {
    // is_in_no_film_zone is from migration 0012 (Phase 5); not yet in the
    // generated database.types.ts (regen is a Wave-4 live step). Cast to any.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: blocked } = await (supabase as any).rpc('is_in_no_film_zone', {
      p_lat: input.lat,
      p_lng: input.lng,
    });
    if (blocked === true) {
      throw new Error(
        'This location is a no-film zone and cannot be checked.',
      );
    }
  }

  // Build the insert payload. When lat + lng are present, also write `coord`
  // as WKT with LONGITUDE first (PostGIS convention, Pitfall 1). This powers
  // dispatch (DISP-01) + verify-clip (VER-01) with a spatial index.
  const coordWkt =
    input.lat !== undefined && input.lng !== undefined
      ? `POINT(${input.lng} ${input.lat})`
      : null;

  // `coord` (geography column from 0012) is not yet in database.types.ts —
  // regen is a Wave-4 live step. Cast insert payload to any to unblock tsc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('checks')
    .insert({
      seeker_id: uid,
      tier: input.tier,
      status: 'requested',
      location_label: input.locationLabel,
      requested_lat: input.lat ?? null,
      requested_lng: input.lng ?? null,
      // coord powers dispatch (DISP-01) + verify-clip (VER-01). lng first.
      ...(coordWkt ? { coord: coordWkt } : {}),
      venue_id: input.venueId ?? null,
      market_id: input.marketId ?? null,
      currency: input.currency ?? 'USD',
      // Link the authorized hold so capture-on-delivery can find it (PAY-01).
      ...(input.paymentIntentId ? { stripe_payment_intent_id: input.paymentIntentId } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
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
 * Seeker history: the current Seeker's own checks, newest first. RLS already
 * confines a Seeker to their own rows (seeker_id = auth.uid(), migration 0009);
 * the explicit eq is belt-and-braces and lets the planner use the index.
 */
export async function listMyChecks(): Promise<CheckRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('seeker_id', uid)
    .order('created_at', { ascending: false });
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
  // There is NO unique constraint on (check_id, seeker_id), so upsert/onConflict
  // can't be used. Delete-then-insert makes re-rating idempotent (one rating row
  // per seeker per check) without a migration.
  await supabase.from('ratings').delete().eq('check_id', checkId).eq('seeker_id', uid);
  const { error: rateError } = await supabase
    .from('ratings')
    .insert({ check_id: checkId, seeker_id: uid, stars });
  if (rateError) throw rateError;

  // Move delivered -> rated. On a RE-rate the check is already 'rated', so this
  // transition is a no-op that may error — the rating itself is saved (above),
  // which is what the user intended, so a re-rate must NOT surface as a failure.
  const { error } = await supabase.rpc('transition_check', {
    p_check_id: checkId,
    p_to: 'rated',
  });
  if (error && !/transition|already|rated/i.test(error.message ?? '')) throw error;
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
 * End a still-unmatched check as `no_scout` when no Scout accepts within the
 * dispatch window. INTERIM: until Phase 5's server-side dispatch+expiry engine
 * lands, the owning Seeker drives this terminal transition (the migration 0010
 * transition rule explicitly authorizes the seeker as a test-trigger this phase).
 * Safe to call optimistically: the DB rejects it if the check already advanced
 * past `dispatching` (e.g. a Scout assigned first), so we swallow that race.
 */
export async function expireUnmatchedCheck(checkId: string): Promise<void> {
  const { error } = await supabase.rpc('transition_check', {
    p_check_id: checkId,
    p_to: 'no_scout',
  });
  // A lost race (Scout assigned just before the timeout) is an expected no-op,
  // not an error to surface — the Realtime row will route the Seeker correctly.
  if (error && !/transition|assigned|only the/i.test(error.message)) throw error;
}

/**
 * Read the delivered clip metadata for a check (when/where filmed). Consumed by
 * the Seeker delivery screen (Wave 4). Returns null until a clip exists. RLS
 * (0009) confines clips to the check's seeker or assigned scout.
 */
export async function getCheckClip(checkId: string): Promise<ClipRow | null> {
  // A check can legitimately have MORE THAN ONE clip row (retakes, a rejected
  // clip then a re-submit, etc.). Return the LATEST one — never use bare
  // .maybeSingle() here, which throws "multiple rows returned" and (when the
  // caller swallows it) leaves the delivery screen stuck on "Processing…".
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('check_id', checkId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
