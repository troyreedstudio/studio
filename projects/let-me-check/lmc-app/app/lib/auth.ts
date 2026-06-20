// Authentication module (AUTH-01 / AUTH-03 / AUTH-04).
//
// Every sign-in method routes through Supabase Auth. The app NEVER imports an
// SMS-provider SDK or talks to any SMS provider directly — Supabase owns that
// (the provider is configured in the Supabase dashboard, not the client bundle).
//
// Scope this wave: Apple + Google are the LIVE methods (native idToken handed
// to supabase.auth.signInWithIdToken — Supabase verifies the provider signature
// server-side, so the client never self-asserts identity).
//
// Phone OTP is DEFERRED behind PHONE_AUTH_ENABLED=false because the SMS provider
// + A2P 10DLC registration are not live yet (pending the US business entity).
// The real supabase.auth.signInWithOtp / verifyOtp wiring is written below but
// gated, so flipping the flag (once the SMS provider is configured in the
// Supabase dashboard) is the only change needed.
// TODO(wave-2.1): enable once the SMS provider + A2P registration are live.

import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from './config';
import { logEvent, setCurrentRole, type Role } from './api';

/**
 * Master switch for the phone-OTP path. Keep false until the SMS provider +
 * A2P 10DLC registration are live and that provider is configured in the
 * Supabase Auth dashboard. Flip to true (and nothing else) to enable phone.
 */
export const PHONE_AUTH_ENABLED = false;

// ── Apple (live) ──────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<void> {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!cred.identityToken) throw new Error('Apple sign-in did not return an identity token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: cred.identityToken,
  });
  if (error) throw error;
  await logEvent('auth.signed_in', { method: 'apple' });
}

// ── Google (live) ─────────────────────────────────────────────────────────────

let googleConfigured = false;

/** Configure the native Google SDK once. Client IDs come from lib/config (bundled
 *  public values) — expo-constants `extra` is null on-device and .env isn't inlined
 *  in Release, so neither is reliable; the bundled module always is. */
function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // The WEB client ID is the audience Supabase verifies the idToken against.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<void> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  // google-signin v16 nests the token under data.idToken; tolerate both shapes.
  const idToken =
    (result as { data?: { idToken?: string | null } }).data?.idToken ??
    (result as { idToken?: string | null }).idToken;
  if (!idToken) throw new Error('Google sign-in did not return an idToken');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  await logEvent('auth.signed_in', { method: 'google' });
}

// ── Phone OTP (deferred — guarded) ────────────────────────────────────────────

const E164 = /^\+[1-9]\d{6,14}$/;

function assertPhoneEnabled(): void {
  if (!PHONE_AUTH_ENABLED) {
    throw new Error('Phone sign-in coming soon. Use Apple or Google to continue.');
  }
}

/**
 * Send an SMS OTP via Supabase Auth (Supabase → SMS provider). Deferred this wave.
 * Validates E.164 at the boundary before any network call.
 */
export async function sendPhoneOtp(phone: string): Promise<void> {
  if (!E164.test(phone)) throw new Error('Enter a valid phone number in international format.');
  assertPhoneEnabled();
  // Live path (enabled once PHONE_AUTH_ENABLED flips true):
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/**
 * Verify the SMS OTP via Supabase Auth. Deferred this wave.
 */
export async function verifyPhoneOtp(phone: string, code: string): Promise<void> {
  if (!E164.test(phone)) throw new Error('Enter a valid phone number in international format.');
  if (!/^\d{4,8}$/.test(code)) throw new Error('Enter the code we texted you.');
  assertPhoneEnabled();
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
  if (error) throw error;
  await logEvent('auth.signed_in', { method: 'phone' });
}

// ── Sign out (AUTH-04) ────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await logEvent('auth.signed_out');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Role switch (AUTH-03) — thin delegate to the data layer ───────────────────

export async function switchRole(role: Role): Promise<void> {
  await setCurrentRole(role);
}
