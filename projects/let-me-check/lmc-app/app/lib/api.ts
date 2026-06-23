// Thin, typed data layer over Supabase (DATA-01 / DATA-02).
//
// Every wrapper is keyed off the authenticated user (auth.uid()); RLS enforces
// ownership server-side, so these functions never pass a user id from the
// client for security decisions. They mirror the export surfaces of the
// in-memory stores in app/state/* so Plan 03 can swap the stores to call these
// with minimal screen churn.
//
// The client never writes checks.status / scout_id (DATA-02) — those go through
// the server-owned transition RPC/Edge Function. The wrappers here only touch
// user-owned rows.

import { supabase } from './supabase';
import type { Database } from './database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type SavedPlaceRow = Database['public']['Tables']['saved_places']['Row'];
type RecentRow = Database['public']['Tables']['recents']['Row'];
type RecurringRow = Database['public']['Tables']['recurring_checks']['Row'];
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];

export type Role = 'seeker' | 'scout';

/** Resolve the current authed user id, or throw if signed out. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// ── Event log ───────────────────────────────────────────────────────────────
// Client-safe events go through the server-side log_event RPC (it stamps
// actor_id from auth.uid()). Trust-critical events (status changes, payouts)
// are written server-side in later phases and never from here.

export async function logEvent(
  eventType: string,
  context?: Record<string, unknown>,
  subjectType?: string,
  subjectId?: string,
): Promise<void> {
  await supabase.rpc('log_event', {
    p_event_type: eventType,
    p_context: (context ?? {}) as Database['public']['Tables']['event_log']['Row']['context'],
    p_subject_type: subjectType,
    p_subject_id: subjectId,
  });
}

// ── Profile + role (AUTH-03) ──────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileRow | null> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setCurrentRole(role: Role): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('profiles')
    .update({ current_role: role })
    .eq('id', uid);
  if (error) throw error;
  await logEvent('auth.role_switched', { to: role });
}

export type IntendedRole = 'seeker' | 'scout' | 'both';

/**
 * Persist the role the user chose at onboarding (AUTH-03). 'both' enables both
 * hubs with current_role defaulting to 'seeker'. Updates the is_seeker/is_scout
 * flags + current_role on the profile and logs the intent.
 */
export async function setIntendedRoleFlags(intended: IntendedRole): Promise<void> {
  const uid = await requireUserId();
  const isSeeker = intended === 'seeker' || intended === 'both';
  const isScout = intended === 'scout' || intended === 'both';
  const currentRole: Role = intended === 'scout' ? 'scout' : 'seeker';
  const { error } = await supabase
    .from('profiles')
    .update({ is_seeker: isSeeker, is_scout: isScout, current_role: currentRole })
    .eq('id', uid);
  if (error) throw error;
  await logEvent('profile.role_intent_set', { intended });
}

/** Derive the onboarding-style intended role from the profile flags. */
export async function getIntendedRoleFlags(): Promise<IntendedRole | null> {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.is_seeker && profile.is_scout) return 'both';
  if (profile.is_scout) return 'scout';
  if (profile.is_seeker) return 'seeker';
  return null;
}

/**
 * Update user-editable profile fields (display_name, phone).
 * Email is auth-managed (supabase.auth.updateUser) — not handled here.
 * Logs a profile.updated event for the audit trail.
 */
export async function updateProfile(fields: {
  displayName?: string;
  phone?: string;
}): Promise<void> {
  const uid = await requireUserId();
  const updatePayload: { display_name?: string; phone?: string } = {};
  if (fields.displayName !== undefined) updatePayload.display_name = fields.displayName;
  if (fields.phone !== undefined) updatePayload.phone = fields.phone;
  if (Object.keys(updatePayload).length === 0) return;
  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', uid);
  if (error) throw error;
  await logEvent('profile.updated', { fields: Object.keys(updatePayload) });
}

// ── Consent (SAFE-02) ─────────────────────────────────────────────────────────

export async function recordConsent(
  type: string,
  docVersion: string,
  jurisdiction?: string,
): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from('consents').insert({
    user_id: uid,
    consent_type: type,
    doc_version: docVersion,
    jurisdiction: jurisdiction ?? null,
  });
  if (error) throw error;
  await logEvent('consent.accepted', { type, docVersion, jurisdiction });
}

// ── Saved places (mirrors state/saved.ts) ─────────────────────────────────────

export type SavedPlaceInput = {
  placeKey: string;
  name: string;
  address?: string;
  category?: string;
  coord?: [number, number];
  marketId?: string;
};

export async function getSavedPlaces(): Promise<SavedPlaceRow[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('saved_places')
    .select('*')
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addSavedPlace(place: SavedPlaceInput): Promise<void> {
  const uid = await requireUserId();
  // Persist coord as WKT geography point (longitude FIRST — PostGIS convention).
  // This is the same pattern used by createCheck (lib/checks.ts). Without this,
  // tapping CHECK on a saved place drops a pin at [0,0] (null island).
  const coordWkt =
    place.coord && place.coord[0] !== 0 && place.coord[1] !== 0
      ? `POINT(${place.coord[0]} ${place.coord[1]})`
      : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('saved_places') as any).insert({
    user_id: uid,
    place_key: place.placeKey,
    name: place.name,
    address: place.address ?? null,
    category: place.category ?? null,
    market_id: place.marketId ?? null,
    ...(coordWkt ? { coord: coordWkt } : {}),
  });
  if (error) throw error;
  await logEvent('saved_place.added', { placeKey: place.placeKey });
}

export async function removeSavedPlace(placeKey: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('place_key', placeKey);
  if (error) throw error;
  await logEvent('saved_place.removed', { placeKey });
}

// ── Recents (mirrors state/recents.ts) ────────────────────────────────────────

export async function getRecents(): Promise<RecentRow[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('recents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function addRecent(entry: { name: string; city?: string }): Promise<void> {
  const uid = await requireUserId();
  if (!entry.name) return;
  const { error } = await supabase.from('recents').insert({
    user_id: uid,
    name: entry.name,
    city: entry.city ?? null,
  });
  if (error) throw error;
}

// ── Recurring checks (mirrors state/recurring.ts) ─────────────────────────────

export type RecurringInput = {
  venueName: string;
  address?: string;
  freq: 'daily' | 'weekly' | 'monthly';
  time: string;
  marketId?: string;
};

export async function getRecurring(): Promise<RecurringRow[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('recurring_checks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addRecurring(item: RecurringInput): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from('recurring_checks').insert({
    user_id: uid,
    venue_name: item.venueName,
    address: item.address ?? null,
    freq: item.freq,
    time: item.time,
    market_id: item.marketId ?? null,
  });
  if (error) throw error;
  await logEvent('recurring.created', { venueName: item.venueName, freq: item.freq });
}

export async function toggleRecurring(id: string, active: boolean): Promise<void> {
  await requireUserId();
  const { error } = await supabase
    .from('recurring_checks')
    .update({ active })
    .eq('id', id);
  if (error) throw error;
  await logEvent('recurring.toggled', { id, active });
}

export async function removeRecurring(id: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase.from('recurring_checks').delete().eq('id', id);
  if (error) throw error;
}

// ── Payment method placeholder (mirrors state/payment-method.ts) ──────────────
// No Stripe in Phase 1: only the brand + last4 display shape is stored.

export async function getPaymentMethod(): Promise<PaymentMethodRow | null> {
  await requireUserId();
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('saved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePaymentMethod(brand: string, last4: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('payment_methods')
    .insert({ user_id: uid, brand, last4 });
  if (error) throw error;
  await logEvent('payment_method.added', { brand });
}

export async function clearPaymentMethod(): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('user_id', uid);
  if (error) throw error;
}
