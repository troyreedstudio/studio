// Unit test for the Supabase client + SecureStore session adapter (AUTH-02).
//
// Vitest runs in node, so the native modules (expo-secure-store, react-native
// AppState) are mocked. We assert:
//   1. createClient is called with persistSession + autoRefreshToken + a storage adapter.
//   2. The storage adapter proxies expo-secure-store get/set/delete.
//   3. AppState drives start/stopAutoRefresh.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const secureStore = {
  getItemAsync: vi.fn(async (_k: string) => 'stored-value'),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
};

const auth = {
  startAutoRefresh: vi.fn(),
  stopAutoRefresh: vi.fn(),
};

let capturedOptions: any = null;
let appStateHandler: ((s: string) => void) | null = null;

vi.mock('expo-secure-store', () => secureStore);

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn((_evt: string, handler: (s: string) => void) => {
      appStateHandler = handler;
      return { remove: vi.fn() };
    }),
  },
}));

vi.mock('react-native-url-polyfill/auto', () => ({}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options: any) => {
    capturedOptions = options;
    return { auth };
  }),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  capturedOptions = null;
  appStateHandler = null;
  vi.clearAllMocks();
  vi.resetModules(); // re-run supabase.ts side effects fresh in each test
});

describe('lib/supabase', () => {
  it('configures the client with a SecureStore adapter + persistent session', async () => {
    await import('./supabase');

    expect(capturedOptions).toBeTruthy();
    expect(capturedOptions.auth.persistSession).toBe(true);
    expect(capturedOptions.auth.autoRefreshToken).toBe(true);
    expect(capturedOptions.auth.detectSessionInUrl).toBe(false);
    expect(capturedOptions.auth.storage).toBeTruthy();
  });

  it('storage adapter proxies expo-secure-store', async () => {
    await import('./supabase');
    const storage = capturedOptions.auth.storage;

    await storage.getItem('k');
    await storage.setItem('k', 'v');
    await storage.removeItem('k');

    expect(secureStore.getItemAsync).toHaveBeenCalledWith('k');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('k');
  });

  it('drives auto-refresh from AppState', async () => {
    await import('./supabase');
    expect(appStateHandler).toBeTruthy();

    appStateHandler!('active');
    expect(auth.startAutoRefresh).toHaveBeenCalled();

    appStateHandler!('background');
    expect(auth.stopAutoRefresh).toHaveBeenCalled();
  });
});
