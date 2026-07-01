// Push notification helpers (PUSH-12, PUSH-13).
//
// registerPushToken(): requests permission and fetches the ExpoPushToken.
//   - Skips silently on simulators (Device.isDevice === false).
//   - Returns null if permission is denied.
//   - Reads the EAS projectId from the bundled config (NOT expo-constants Extra —
//     which is null in Release builds, same crash class as the SUPABASE_URL issue).
//
// upsertPushToken(token, platform): upserts the device row in device_push_tokens.
//   - Keyed on (user_id, token); idempotent.
//   - Uses `as any` cast because device_push_tokens is not in database.types.ts
//     until Wave-4 type regen (established Phase-5 pattern).
//
// deletePushToken(token): removes this device's token for the current user.
//   - Best-effort cleanup on sign-out; errors are swallowed.
//
// All three are intended as fire-and-forget from auth.ts — they NEVER throw
// into the sign-in / sign-out flow.

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { EAS_PROJECT_ID } from './config';

// ── Permission + token registration ──────────────────────────────────────────

/**
 * Request push permission and return the ExpoPushToken string, or null if:
 *   - running on a simulator (Device.isDevice === false)
 *   - the user denies the permission prompt
 *
 * Safe to call multiple times; the OS remembers permission once granted.
 * Never throws — callers are fire-and-forget (auth.ts).
 */
export async function registerPushToken(): Promise<string | null> {
  // Simulators cannot receive real APNs tokens — skip silently.
  if (!Device.isDevice) return null;

  // Android 13+ requires an explicit notification channel before requesting
  // permission. Create the default channel used for all LMC pushes.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Check existing permission; only prompt if not yet granted.
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // EAS_PROJECT_ID is bundled in config.ts — always present in Release builds.
  // (Constants.expoConfig.extra is null in Release; never use that path here.)
  // NOTE: the APNs entitlement (aps-environment) is deferred post-v1 (see app.config.js),
  // so getExpoPushTokenAsync will throw on-device until the push key is set up. Guard it
  // and return null so callers stay fire-and-forget. Restore is a no-op once the plugin
  // is re-added — this try/catch is harmless with the entitlement present.
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
    return token; // 'ExponentPushToken[xxxxxx]'
  } catch {
    return null; // push not available yet (entitlement deferred)
  }
}

// ── Token persistence ─────────────────────────────────────────────────────────

/**
 * Upsert the device's push token into device_push_tokens.
 * Keyed on (user_id, token) — safe to call repeatedly; idempotent.
 * Returns early if no authenticated session exists.
 */
export async function upsertPushToken(token: string, platform: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // device_push_tokens is not in database.types.ts until Wave-4 regen — cast to any.
  await (supabase as any)
    .from('device_push_tokens')
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
}

/**
 * Delete this device's push token for the current user.
 * Best-effort: errors are swallowed so sign-out is never blocked.
 * Returns early if no authenticated session exists.
 */
export async function deletePushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // device_push_tokens is not in database.types.ts until Wave-4 regen — cast to any.
    await (supabase as any)
      .from('device_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token);
  } catch {
    // Best-effort cleanup — never block sign-out.
  }
}
