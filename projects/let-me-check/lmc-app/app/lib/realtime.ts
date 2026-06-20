// Realtime: the Seeker watches ONE check live (DISP-04).
//
// Postgres Changes (not Broadcast) is the right tool for a single user watching
// one row at human pace: it is RLS-enforced per event, so a Seeker only receives
// updates for their OWN check (checks_select_own, migration 0005). The table is
// in the supabase_realtime publication (migration 0009). Broadcast is reserved
// for Phase-5 high-frequency dispatch.
//
// Reconnection: the .subscribe() status callback surfaces
// SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED. On error/timeout we invoke
// onError so the caller can re-fetch the row with getCheck() and reconcile any
// transition missed while disconnected (the row is source-of-truth). The screen
// pairs this with an initial getCheck() — that wiring lives in Plan 04, not here.

import { supabase } from './supabase';
import type { CheckRow } from './checks';

/**
 * Subscribe to live status changes for a single check.
 *
 * @param checkId  the check to watch
 * @param onStatus called with the new check row on every UPDATE
 * @param onError  optional; called on CHANNEL_ERROR / TIMED_OUT so the caller can re-fetch
 * @returns a teardown that removes the channel
 */
export function subscribeToCheck(
  checkId: string,
  onStatus: (row: CheckRow) => void,
  onError?: () => void,
): () => void {
  const channel = supabase
    .channel(`check:${checkId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'checks', filter: `id=eq.${checkId}` },
      (payload) => onStatus(payload.new as CheckRow),
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError?.();
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
