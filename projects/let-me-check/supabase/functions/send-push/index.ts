// supabase/functions/send-push/index.ts
//
// LMC Phase 10 (PUSH-04/05/06/07/08/09) — send-push Edge Function.
//
// Server-owned push notification send path. Receives { checkId, event },
// resolves the correct recipient set IDOR-safely (recipients are derived
// server-side from checkId — client input never influences recipients):
//
//   video-ready  -> the check's seeker_id only
//   job-nearby   -> in-range ONLINE scouts, queried from scout_locations
//                   directly via is_online=true + RPC scouts_in_range_of_check,
//                   NOT list_open_checks_for_scout (which is scout-centric /
//                   wrong direction). Pitfall 4: token table never dictates audience.
//
// For each recipient: reads notification_prefs from profiles (Phase 9 column).
//   video-ready key: 'delivered'
//   job-nearby key:  'job-nearby'
// Null prefs / missing key -> push all (D-04 default-on).
//
// Batches tokens <=100 per POST to https://exp.host/--/api/v2/push/send.
// Cleans up DeviceNotRegistered tokens inline.
// NEVER throws — entire body wrapped in try/catch; always returns 200.
//
// Deploy with --no-verify-jwt (Wave 4 / 10-05): called server-to-server by
// the pg trigger (job-nearby) and mux-webhook (video-ready), no user JWT.
//
// T-10-05: IDOR — recipients derived from checkId only, never caller input.
// T-10-07: DeviceNotRegistered cleanup runs inline on every send.
// T-10-08: Outer try/catch ensures this function never throws.
// T-10-09: checkId validated as UUID + event as enum before any query.

import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Notification_prefs key for each event type (Phase 9 column). */
const PREFS_KEY: Record<"video-ready" | "job-nearby", string> = {
  "video-ready": "delivered",
  "job-nearby": "job-nearby",
};

/** Copy for each event type. */
const COPY: Record<"video-ready" | "job-nearby", { title: string; body: string }> = {
  "video-ready": {
    title: "Your check is ready",
    body: "Your video is ready to watch.",
  },
  "job-nearby": {
    title: "New check nearby",
    body: "A new check just dropped near you — tap to claim.",
  },
};

/** Split an array into chunks of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Resolve the recipient user IDs for the given event.
 * IDOR-safe: derived entirely from checkId on the server.
 */
async function resolveRecipients(
  checkId: string,
  event: "video-ready" | "job-nearby",
  svc: Svc,
): Promise<string[]> {
  if (event === "video-ready") {
    // Recipient: the check's seeker only.
    const { data, error } = await svc
      .from("checks")
      .select("seeker_id, coord")
      .eq("id", checkId)
      .single();
    if (error || !data?.seeker_id) return [];
    return [data.seeker_id as string];
  }

  // job-nearby: in-range ONLINE scouts.
  // Query scout_locations directly: is_online=true + ST_DWithin against the check's coord.
  // Implemented via a SECURITY DEFINER RPC scouts_in_range_of_check(p_check_id) which:
  //   SELECT scout_id FROM scout_locations
  //   WHERE is_online = true
  //     AND ST_DWithin(coord, (SELECT coord FROM checks WHERE id = p_check_id),
  //                   (SELECT dispatch_radius_m FROM market_config LIMIT 1))
  // If the RPC does not exist yet, the .rpc() call returns an error and we fall back to
  // an empty list (graceful degrade — never throw). See helper RPC note in 0018 summary.
  //
  // CRITICAL: do NOT use list_open_checks_for_scout here — it is scout-centric (takes a
  // scout coord and returns checks), the opposite direction. We need check-centric:
  // "which scouts are near THIS check?". That's exactly what scouts_in_range_of_check does.
  const { data: scoutRows, error: scoutErr } = await svc.rpc(
    "scouts_in_range_of_check",
    { p_check_id: checkId },
  );
  if (scoutErr || !Array.isArray(scoutRows) || scoutRows.length === 0) return [];
  return (scoutRows as Array<{ scout_id: string }>).map((r) => r.scout_id);
}

/**
 * Filter recipients by their notification_prefs for the given event.
 * D-04: null prefs OR missing key -> include (default on).
 * Skip ONLY when prefs[key] === false explicitly.
 */
async function filterByPrefs(
  userIds: string[],
  event: "video-ready" | "job-nearby",
  svc: Svc,
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const prefsKey = PREFS_KEY[event];

  // Batch-read profiles.notification_prefs for all recipients.
  const { data: profiles, error } = await svc
    .from("profiles")
    .select("id, notification_prefs")
    .in("id", userIds);

  // If the column doesn't exist or the query fails, degrade to push all (D-04).
  if (error || !Array.isArray(profiles)) return userIds;

  // Build a map: userId -> prefs (null if not found).
  const prefsMap = new Map<string, Record<string, unknown> | null>();
  for (const row of profiles as Array<{ id: string; notification_prefs: Record<string, unknown> | null }>) {
    prefsMap.set(row.id, row.notification_prefs);
  }

  return userIds.filter((uid) => {
    const prefs = prefsMap.get(uid);
    // null prefs (column exists but not set) -> include.
    if (prefs === null || prefs === undefined) return true;
    // Missing key in prefs object -> include (default on).
    if (!(prefsKey in prefs)) return true;
    // Explicitly false -> skip.
    return prefs[prefsKey] !== false;
  });
}

/**
 * Look up all push tokens for the given user IDs.
 * Returns a flat array of { userId, token } pairs.
 */
async function lookupTokens(
  userIds: string[],
  svc: Svc,
): Promise<Array<{ userId: string; token: string }>> {
  if (userIds.length === 0) return [];

  const { data: rows, error } = await svc
    .from("device_push_tokens")
    .select("user_id, token")
    .in("user_id", userIds);

  if (error || !Array.isArray(rows)) return [];
  return (rows as Array<{ user_id: string; token: string }>).map((r) => ({
    userId: r.user_id,
    token: r.token,
  }));
}

/**
 * Core handler — resolves recipients, filters prefs, batches to Expo, cleans up.
 * NEVER throws. All errors are caught and logged.
 */
export async function handleSendPush(
  checkId: string,
  event: "video-ready" | "job-nearby",
  svc: Svc,
): Promise<void> {
  try {
    // 1. Resolve recipients IDOR-safely from checkId (server-side only).
    const recipientIds = await resolveRecipients(checkId, event, svc);
    if (recipientIds.length === 0) {
      // Log skipped (no recipients for this event)
      try {
        await svc.rpc("log_event", {
          p_event_type: "push.skipped_no_recipients",
          p_subject_type: "check",
          p_subject_id: checkId,
          p_context: { event },
        });
      } catch (_) { /* swallow logging errors */ }
      return;
    }

    // 2. Filter by notification_prefs (D-04: null = push all).
    const includedIds = await filterByPrefs(recipientIds, event, svc);
    const skippedCount = recipientIds.length - includedIds.length;

    if (includedIds.length === 0) {
      // All recipients opted out of this event category.
      try {
        await svc.rpc("log_event", {
          p_event_type: "push.skipped_prefs",
          p_subject_type: "check",
          p_subject_id: checkId,
          p_context: { event, skipped: skippedCount },
        });
      } catch (_) { /* swallow */ }
      return;
    }

    // 3. Look up device tokens for included recipients.
    const tokenRows = await lookupTokens(includedIds, svc);
    if (tokenRows.length === 0) {
      // No registered devices for these recipients.
      try {
        await svc.rpc("log_event", {
          p_event_type: "push.skipped_no_tokens",
          p_subject_type: "check",
          p_subject_id: checkId,
          p_context: { event, recipients: includedIds.length },
        });
      } catch (_) { /* swallow */ }
      return;
    }

    // 4. Build Expo messages. Copy uses "video" never "clip" (LMC brand rule).
    const { title, body: msgBody } = COPY[event];
    const messages = tokenRows.map(({ token }) => ({
      to: token,
      title,
      body: msgBody,
      data: { checkId, event },
    }));

    // 5. Batch <=100 per POST to Expo Push API.
    // No access token needed for basic sends (docs.expo.dev confirmed).
    const batches = chunk(messages, 100);
    let sentCount = 0;

    for (const batch of batches) {
      let tickets: Array<{ status: string; details?: { error?: string } }> = [];

      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(batch),
        });

        const json = await res.json() as { data: typeof tickets };
        tickets = json.data ?? [];
        sentCount += batch.length;
      } catch (_fetchErr) {
        // Network error — skip this batch, continue (advisory push)
        continue;
      }

      // 6. Cleanup: delete DeviceNotRegistered tokens (T-10-07).
      // tickets array is parallel to batch array — index matches.
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          const staleToken = batch[i].to;
          try {
            await svc
              .from("device_push_tokens")
              .delete()
              .eq("token", staleToken);
          } catch (_delErr) {
            // swallow — token cleanup is best-effort
          }
        }
      }
    }

    // 7. Log successful send.
    try {
      await svc.rpc("log_event", {
        p_event_type: "push.sent",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: {
          event,
          recipients: includedIds.length,
          tokens: tokenRows.length,
          sent: sentCount,
          skipped_prefs: skippedCount,
        },
      });
    } catch (_) { /* swallow */ }
  } catch (_outer) {
    // T-10-08: catch-all — push failure NEVER propagates to caller.
    // Log the error if possible but do not rethrow.
    try {
      await svc.rpc("log_event", {
        p_event_type: "push.error",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { event, error: String(_outer) },
      });
    } catch (_inner) {
      // swallow inner logging error too
    }
  }
}

// ── UUID validation helper ────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Live entrypoint ───────────────────────────────────────────────────────────
// Called by the pg trigger (job-nearby) and mux-webhook (video-ready) fire-and-forget.
// import.meta.main guard so `deno test --allow-env` imports without binding a port.
// Deployed with --no-verify-jwt (Wave 4 / 10-05): service-to-service, no user JWT.
//
// T-10-09: bad input returns 400; all other paths return 200 regardless of push outcome.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    let checkId: string | undefined;
    let event: string | undefined;

    try {
      const body = await req.json() as { checkId?: unknown; event?: unknown };
      checkId = typeof body.checkId === "string" ? body.checkId : undefined;
      event = typeof body.event === "string" ? body.event : undefined;
    } catch (_parseErr) {
      return new Response("invalid JSON", { status: 400 });
    }

    // T-10-09: validate checkId as UUID and event as enum — 400 on bad input.
    if (!checkId || !UUID_RE.test(checkId)) {
      return new Response("invalid or missing checkId (must be a UUID)", { status: 400 });
    }
    if (event !== "video-ready" && event !== "job-nearby") {
      return new Response("invalid or missing event (must be video-ready|job-nearby)", {
        status: 400,
      });
    }

    const svc = serviceClient();

    // Fire-and-forget: call handleSendPush but ALWAYS return 200 (D-03).
    // Push failure must never block the calling transition/webhook.
    await handleSendPush(checkId, event as "video-ready" | "job-nearby", svc);

    return new Response("ok", { status: 200 });
  });
}
