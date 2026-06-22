// supabase/functions/delete-account/index.ts
// LMC Phase 11 — Apple Submission Readiness (D-03): in-app account deletion.
//
// THIS IS A USER-CALLABLE FUNCTION (JWT verification enabled — do NOT deploy with
// --no-verify-jwt). The caller must be the account owner. uid is derived ONLY from
// the verified bearer token (IDOR-safe: never from the request body).
//
// Flow:
//   1. POST only — any other method -> 405.
//   2. Resolve caller uid via authedClient(req).auth.getUser() -> 401 if null/error.
//      uid is taken from the verified JWT only; any user_id in the request body is
//      silently ignored (T-11-01 IDOR guard).
//   3. Read optional reason from JSON body (string; RPC also truncates to 500 chars).
//   4. Call authedClient(req).rpc('delete_my_account', { p_reason }) so the RPC
//      runs with auth.uid() = caller's uid. This cancels open checks, anonymizes
//      financial rows, removes PII, and nulls event_log.actor_id (migration 0021).
//   5. Call serviceClient().auth.admin.deleteUser(uid) to remove the auth.users row.
//   6. Return 200 { ok: true } on success.
//
// Security notes (STRIDE T-11-01..T-11-06):
//   - uid NEVER from request body (T-11-01 IDOR).
//   - The RPC + admin delete are both guarded by the caller's identity from the JWT.
//   - Deletion is irreversible — the migration + Edge Function are the only path.
//   - auth.admin.deleteUser requires the service role (serviceClient), not the authed
//     client. The authed client is used for the RPC so auth.uid() resolves correctly.
//
// Deploy: supabase functions deploy delete-account
// (verify_jwt=TRUE is the default — do NOT pass --no-verify-jwt for this function)

import { authedClient, serviceClient } from "../_shared/supabase.ts";

export async function handler(req: Request): Promise<Response> {
  // 1. Method guard — POST only.
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  // 2. Resolve caller uid from the verified bearer token.
  // authedClient carries the caller's Authorization header; auth.getUser() verifies
  // the JWT server-side and returns the user record.
  // IDOR SAFETY: uid is ONLY from getUser() result — never from req body.
  const authed = authedClient(req);
  const { data: userData, error: authError } = await authed.auth.getUser();
  if (authError || !userData?.user) {
    return new Response("not authenticated", { status: 401 });
  }
  const uid = userData.user.id;

  // 3. Read optional reason from body — body field 'user_id' is intentionally ignored.
  let reason: string | null = null;
  try {
    const body = await req.json();
    // Only read 'reason' from the body. Any 'user_id' or other uid-like field is
    // IGNORED — we never let the caller influence which account is deleted (T-11-01).
    if (typeof body?.reason === "string") {
      reason = body.reason;
    }
  } catch (_e) {
    // No body / non-JSON body — that is fine; reason stays null.
  }

  // 4. Run the cascade-safe deletion RPC as the authenticated caller.
  // The RPC (migration 0021) runs as auth.uid() = uid because we use authedClient.
  // It cancels open checks, anonymizes financial rows, removes PII, nulls event_log.
  const { error: rpcError } = await authed.rpc("delete_my_account", {
    p_reason: reason,
  });
  if (rpcError) {
    return new Response(`deletion rpc failed: ${rpcError.message}`, {
      status: 500,
    });
  }

  // 5. Remove the auth.users row via the service client (auth.admin requires service role).
  // After step 4 all no-cascade FK children have been resolved, so deleteUser will
  // not hit a FK violation.
  const svc = serviceClient();
  const { error: deleteError } = await svc.auth.admin.deleteUser(uid);
  if (deleteError) {
    return new Response(`auth delete failed: ${deleteError.message}`, {
      status: 500,
    });
  }

  // 6. Success.
  return Response.json({ ok: true });
}

// Live entrypoint: Deno.serve is guarded by import.meta.main so the deno test
// can import `handler` without binding a port (mirrors stripe-capture pattern).
if (import.meta.main) {
  Deno.serve(handler);
}
