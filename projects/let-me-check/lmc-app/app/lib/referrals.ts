// lib/referrals.ts — REF client layer
//
// Two public functions:
//   getMyReferral()      — reads the caller's referral code + aggregate stats
//                          via the get_my_referral_stats() SECURITY DEFINER RPC.
//   applyReferralCode()  — attributes the current (new) user to a referrer.
//                          Delegates to the referral-apply edge function so all
//                          guards (no self-refer, once-only, valid code) run
//                          server-side. Returns 'ok' | 'already_attributed' | 'invalid_code'.
//
// Neither function ever writes referrals or credits directly — that happens
// server-side through the Edge Function + qualify_referral() hook.

import { supabase } from './supabase';

export interface ReferralStats {
  code: string;
  invited: number;
  joined: number;
  creditsCents: number;
}

export type ApplyResult =
  | 'ok'
  | 'already_attributed'
  | 'invalid_code'
  | 'self_referral'
  | 'error';

/**
 * Returns the caller's referral code and aggregate invitation stats.
 * Calls the get_my_referral_stats() SECURITY DEFINER RPC — one round-trip.
 * Returns null when the user is not authenticated or the RPC fails.
 */
export async function getMyReferral(): Promise<ReferralStats | null> {
  const { data, error } = await supabase.rpc('get_my_referral_stats');
  if (error || !data) return null;
  const row = data as {
    code: string;
    invited: number;
    joined: number;
    creditsCents: number;
  };
  return {
    code: row.code ?? '',
    invited: row.invited ?? 0,
    joined: row.joined ?? 0,
    creditsCents: row.creditsCents ?? 0,
  };
}

/**
 * Attribute the signed-in user to the referrer who owns the given code.
 * Calls the referral-apply edge function (verify_jwt=true) which enforces:
 *   - Valid code resolves to a real profile
 *   - No self-referral (caller != referrer)
 *   - Once-only attribution (referred_id UNIQUE on referrals table)
 *
 * Returns an ApplyResult discriminant so callers can give targeted feedback.
 * Errors from the edge function are mapped to descriptive strings — never throws.
 */
export async function applyReferralCode(code: string): Promise<ApplyResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return 'invalid_code';

  const { data, error } = await supabase.functions.invoke('referral-apply', {
    body: { code: trimmed },
  });

  if (error) {
    // Edge function returns structured errors via the response body even when the
    // HTTP status is 4xx. Try to parse the edge fn's own error field first.
    const msg: string =
      (data as { error?: string } | null)?.error ??
      (error as { message?: string }).message ??
      '';

    if (msg.includes('already_attributed')) return 'already_attributed';
    if (msg.includes('self_referral'))      return 'self_referral';
    if (msg.includes('invalid_code'))       return 'invalid_code';
    return 'error';
  }

  return (data as { result?: string })?.result === 'ok' ? 'ok' : 'error';
}
