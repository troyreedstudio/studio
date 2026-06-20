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
import Constants from 'expo-constants';
import type { Database } from './database.types';

// Release builds do NOT inline `.env` EXPO_PUBLIC_* vars into the embedded JS bundle
// (only dev/export do), so read the public Supabase config from the app manifest
// (`extra`, set in app.config.js) — which IS always bundled — with an env fallback
// for the dev server.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};
const SUPABASE_URL = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: SecureStoreAdapter,
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
