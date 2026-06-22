// app/lib/account.ts
// Account lifecycle operations — currently: delete-account.
//
// The delete-account Edge Function is called via plain fetch() (with a 30-second
// AbortController timeout) rather than supabase.functions.invoke(). The invoke()
// wrapper's generator-based async internals (tslib.__awaiter) can hang indefinitely
// on Hermes/Release builds. Plain fetch + AbortController always resolves or rejects
// within 30 seconds. This is the same pattern as app/lib/payments.ts invokeEdgeFunction.

import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { signOut } from './auth';

/**
 * Authenticated fetch to a Supabase Edge Function with a 30-second timeout.
 * Uses plain fetch() (NOT supabase.functions.invoke) to avoid the Hermes/Release
 * build hang documented in payments.ts.
 */
async function invokeEdgeFunction(
  functionName: string,
  body: unknown,
): Promise<unknown> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      controller.signal.aborted
        ? `invokeEdgeFunction(${functionName}): timed out after 30s`
        : `invokeEdgeFunction(${functionName}): network error — ${msg}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { /* ignore */ }
    throw new Error(
      `invokeEdgeFunction(${functionName}): HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`invokeEdgeFunction(${functionName}): invalid JSON in response`);
  }
  return data;
}

/**
 * Permanently deletes the current user's account and all associated data.
 *
 * Flow:
 *   1. POST to the delete-account Edge Function with the caller's JWT.
 *      The server derives uid from the JWT (IDOR-safe: body field user_id is ignored).
 *   2. On success, call signOut() to clear the local session.
 *
 * Errors propagate to the caller so the UI can show an alert and stay put.
 * reason is optional and capped at 500 chars to prevent abuse.
 */
export async function deleteMyAccount(reason?: string): Promise<void> {
  const body: { reason?: string } = {};
  if (reason) {
    body.reason = reason.slice(0, 500);
  }
  await invokeEdgeFunction('delete-account', body);
  await signOut();
}
