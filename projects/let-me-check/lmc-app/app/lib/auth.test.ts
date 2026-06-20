// Unit tests for the auth module (AUTH-01/03/04).
//
// Vitest runs in node; native sign-in SDKs and the Supabase client are mocked.
// We assert each method routes through Supabase Auth (never a direct SMS-provider
// call) and that the deferred phone-OTP path is guarded behind PHONE_AUTH_ENABLED.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const authClient = {
  signInWithIdToken: vi.fn(async () => ({ data: {}, error: null })),
  signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
  verifyOtp: vi.fn(async () => ({ data: {}, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

const apple = {
  signInAsync: vi.fn(async () => ({ identityToken: 'apple-id-token' })),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
};

const google = {
  GoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: vi.fn(async () => true),
    signIn: vi.fn(async () => ({ data: { idToken: 'google-id-token' } })),
  },
};

const logEvent = vi.fn(async () => undefined);
const setCurrentRole = vi.fn(async () => undefined);

vi.mock('./supabase', () => ({ supabase: { auth: authClient } }));
vi.mock('./api', () => ({ logEvent, setCurrentRole }));
vi.mock('expo-apple-authentication', () => apple);
vi.mock('@react-native-google-signin/google-signin', () => google);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lib/auth', () => {
  it('signInWithApple hands the native idToken to Supabase', async () => {
    const auth = await import('./auth');
    await auth.signInWithApple();
    expect(authClient.signInWithIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'apple', token: 'apple-id-token' }),
    );
    expect(logEvent).toHaveBeenCalledWith('auth.signed_in', { method: 'apple' });
  });

  it('signInWithGoogle hands the native idToken to Supabase', async () => {
    const auth = await import('./auth');
    await auth.signInWithGoogle();
    expect(authClient.signInWithIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', token: 'google-id-token' }),
    );
    expect(logEvent).toHaveBeenCalledWith('auth.signed_in', { method: 'google' });
  });

  it('signOut logs then clears the Supabase session', async () => {
    const auth = await import('./auth');
    await auth.signOut();
    expect(logEvent).toHaveBeenCalledWith('auth.signed_out');
    expect(authClient.signOut).toHaveBeenCalled();
  });

  it('switchRole delegates to api.setCurrentRole', async () => {
    const auth = await import('./auth');
    await auth.switchRole('scout');
    expect(setCurrentRole).toHaveBeenCalledWith('scout');
  });

  it('phone OTP is deferred (guarded by PHONE_AUTH_ENABLED=false) and never calls Supabase', async () => {
    const auth = await import('./auth');
    expect(auth.PHONE_AUTH_ENABLED).toBe(false);
    await expect(auth.sendPhoneOtp('+13055550100')).rejects.toThrow(/coming soon/i);
    await expect(auth.verifyPhoneOtp('+13055550100', '123456')).rejects.toThrow(/coming soon/i);
    expect(authClient.signInWithOtp).not.toHaveBeenCalled();
    expect(authClient.verifyOtp).not.toHaveBeenCalled();
  });

  it('rejects a non-E.164 phone before any network call', async () => {
    const auth = await import('./auth');
    await expect(auth.sendPhoneOtp('not-a-number')).rejects.toThrow();
    expect(authClient.signInWithOtp).not.toHaveBeenCalled();
  });
});
