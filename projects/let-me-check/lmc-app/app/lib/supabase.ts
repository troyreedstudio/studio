// Single Supabase client for the whole app (AUTH-02).
//
// The auth session (refresh token) is a high-value secret, so it is stored via
// expo-secure-store (iOS Keychain / Android Keystore) — never a plaintext
// key-value store. persistSession + autoRefreshToken keep the user signed in
// across restarts; AppState drives token refresh while the app is foregrounded.
//
// Only the public, RLS-protected anon key lives in the client bundle. The
// service-role key must never appear here.
//
// SecureStore caveat: values are capped at ~2KB on iOS. A normal Supabase
// session fits comfortably. If a session ever exceeds the cap (e.g. very large
// custom claims), the fallback is the community "chunked SecureStore" adapter
// that splits the value across multiple keys. Verify on-device.

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import type { Database } from './database.types';
// Bundled public config — NOT expo-constants/app.config `extra`, which is null on
// a Release build on-device (the native ExponentConstants module isn't linked), and
// NOT `.env` (not inlined in Release). See lib/config.ts.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// expo-secure-store caps a single value at ~2KB on iOS. Apple/Google sessions
// carry enough profile data (identities, provider metadata) to exceed that, which
// made setItem throw AFTER a successful token exchange — the account was created
// server-side but the app could never save the session, so sign-in failed with a
// generic error on every Apple/Google attempt. This adapter transparently splits
// large values into <2KB chunks across multiple Keychain keys and reassembles
// them, so the session still lives in secure storage (never plaintext).
const CHUNK_SIZE = 1600;
const CHUNK_MARK = '__chunked__:'; // head marker, followed by the chunk count

async function clearChunks(key: string): Promise<void> {
  const head = await SecureStore.getItemAsync(key);
  if (head && head.startsWith(CHUNK_MARK)) {
    const count = parseInt(head.slice(CHUNK_MARK.length), 10) || 0;
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}__${i}`);
  }
}

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const head = await SecureStore.getItemAsync(key);
    if (head == null) return null;
    if (!head.startsWith(CHUNK_MARK)) return head; // plain (small) value
    const count = parseInt(head.slice(CHUNK_MARK.length), 10) || 0;
    let out = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}__${i}`);
      if (part == null) return null; // partial/corrupt → treat as no session
      out += part;
    }
    return out;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await clearChunks(key); // drop any stale chunks from a previous larger value
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}__${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(key, `${CHUNK_MARK}${count}`); // write head last
  },
  removeItem: async (key: string): Promise<void> => {
    await clearChunks(key);
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: SecureStoreAdapter,
      // No-op auth lock. supabase-js's default navigatorLock (browser Web Locks API)
      // AND processLock both STALL auth calls on this RN/Hermes build — getSession,
      // getUser, and authed from()/rpc() calls hang indefinitely, which stranded the
      // whole sign-in → payment → create-check flow. RN runs a single app instance
      // with no cross-tab concurrency, so running auth ops without a lock is safe
      // here and removes the hang across the entire data layer.
      lock: (_name, _acquireTimeout, fn) => fn(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // React Native has no URL bar
    },
  },
);

// Refresh the session while the app is foregrounded; pause while backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// ── Access-token cache ──────────────────────────────────────────────────────────
// Edge-function calls need the user's access token in the Authorization header.
// Calling supabase.auth.getSession() in that hot path can STALL on React Native
// (the auth-lock quirk), which made the timeout guard fall back to the anon key →
// HTTP 401 "not authenticated". Instead we cache the token here: onAuthStateChange
// fires on initial load, sign-in, and every token refresh, so this stays current
// and can be read synchronously with zero chance of hanging.
let cachedAccessToken: string | null = null;
let cachedUserId: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
  cachedUserId = session?.user?.id ?? null;
});
void supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    cachedAccessToken = data.session.access_token ?? null;
    cachedUserId = data.session.user?.id ?? null;
  }
});

/** Current user access token (or null if signed out). Synchronous, never hangs. */
export function getAccessToken(): string | null {
  return cachedAccessToken;
}

/** Current user id (or null if signed out). Synchronous — avoids the network
 *  getUser() call, which can stall on RN and hang whatever awaits it. */
export function getUserId(): string | null {
  return cachedUserId;
}
