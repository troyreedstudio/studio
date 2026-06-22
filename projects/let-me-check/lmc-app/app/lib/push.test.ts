// Unit tests for the push module (PUSH-12, PUSH-13).
//
// Vitest runs in node; expo-device, expo-notifications, expo-constants, and
// the Supabase client are mocked. We assert the key behaviours:
//   PUSH-12: registerPushToken() is simulator-safe and permission-safe
//   PUSH-13: upsertPushToken() writes the correct shape to device_push_tokens

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mock state ────────────────────────────────────────────────────────

let mockIsDevice = true;
let mockPermStatus = 'granted';
let mockToken = 'ExponentPushToken[test-token-abc]';
let mockUser = { id: 'user-uuid-123' };

const upsert = vi.fn(() => ({ error: null }));
const deleteMock = vi.fn(() => ({ error: null }));
const eqChain = { eq: vi.fn(() => ({ error: null })) };

const notificationsMock = {
  getPermissionsAsync: vi.fn(async () => ({ status: mockPermStatus })),
  requestPermissionsAsync: vi.fn(async () => ({ status: mockPermStatus })),
  getExpoPushTokenAsync: vi.fn(async ({ projectId }: { projectId: string }) => ({
    data: mockToken,
    projectId,
  })),
  setNotificationChannelAsync: vi.fn(async () => {}),
  AndroidImportance: { MAX: 5 },
};

const deviceMock = {
  isDevice: true, // overridden per test via Object.defineProperty
};

// Supabase mock chain: from('device_push_tokens').upsert(...) / .delete().eq().eq()
const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: mockUser } })),
  },
  from: vi.fn(() => ({
    upsert,
    delete: vi.fn(() => ({
      eq: vi.fn(() => eqChain),
    })),
  })),
};

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('expo-notifications', () => notificationsMock);
vi.mock('expo-device', () => deviceMock);
vi.mock('./supabase', () => ({ supabase: supabaseMock }));
vi.mock('./config', () => ({
  EAS_PROJECT_ID: '59bc5e82-de99-4541-b883-82e09005acfc',
}));

// react-native Platform — default ios for tests
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setIsDevice(value: boolean) {
  Object.defineProperty(deviceMock, 'isDevice', {
    value,
    configurable: true,
    writable: true,
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset shared mock state to defaults
  mockIsDevice = true;
  mockPermStatus = 'granted';
  mockToken = 'ExponentPushToken[test-token-abc]';
  mockUser = { id: 'user-uuid-123' };
  setIsDevice(true);

  // Reset supabase.auth.getUser to return the current mockUser
  supabaseMock.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
});

describe('lib/push — registerPushToken (PUSH-12)', () => {
  it('returns null on a non-physical device (simulator) without calling getExpoPushTokenAsync', async () => {
    setIsDevice(false);
    const { registerPushToken } = await import('./push');
    const result = await registerPushToken();
    expect(result).toBeNull();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns null when permission is denied (requestPermissionsAsync denies)', async () => {
    setIsDevice(true);
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    notificationsMock.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { registerPushToken } = await import('./push');
    const result = await registerPushToken();
    expect(result).toBeNull();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns null when existing permission is undetermined and request is denied', async () => {
    setIsDevice(true);
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    notificationsMock.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { registerPushToken } = await import('./push');
    const result = await registerPushToken();
    expect(result).toBeNull();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns the push token string on a physical device with granted permission', async () => {
    setIsDevice(true);
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const { registerPushToken } = await import('./push');
    const result = await registerPushToken();
    expect(result).toBe('ExponentPushToken[test-token-abc]');
    expect(notificationsMock.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: '59bc5e82-de99-4541-b883-82e09005acfc',
    });
  });

  it('skips requestPermissionsAsync when existing permission is already granted', async () => {
    setIsDevice(true);
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const { registerPushToken } = await import('./push');
    await registerPushToken();
    expect(notificationsMock.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('lib/push — upsertPushToken (PUSH-13)', () => {
  it('calls supabase.from("device_push_tokens").upsert with the correct payload shape', async () => {
    const { upsertPushToken } = await import('./push');
    await upsertPushToken('ExponentPushToken[test-token-abc]', 'ios');

    expect(supabaseMock.from).toHaveBeenCalledWith('device_push_tokens');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-123',
        token: 'ExponentPushToken[test-token-abc]',
        platform: 'ios',
      }),
      { onConflict: 'user_id,token' },
    );
    // updated_at must be a non-empty ISO string
    const payload = upsert.mock.calls[0][0] as Record<string, string>;
    expect(payload.updated_at).toBeTruthy();
    expect(typeof payload.updated_at).toBe('string');
  });

  it('returns early without calling upsert when no authenticated user', async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const { upsertPushToken } = await import('./push');
    await upsertPushToken('ExponentPushToken[test-token-abc]', 'ios');
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('lib/push — deletePushToken', () => {
  it('calls supabase delete chain when user is present', async () => {
    const { deletePushToken } = await import('./push');
    // Should not throw
    await expect(deletePushToken('ExponentPushToken[test-token-abc]')).resolves.toBeUndefined();
    expect(supabaseMock.from).toHaveBeenCalledWith('device_push_tokens');
  });

  it('returns early without calling delete when no authenticated user', async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const { deletePushToken } = await import('./push');
    await deletePushToken('ExponentPushToken[test-token-abc]');
    // from() should not be called for device_push_tokens in this case
    const calls = (supabaseMock.from as ReturnType<typeof vi.fn>).mock.calls;
    const tokenCalls = calls.filter((c: string[]) => c[0] === 'device_push_tokens');
    expect(tokenCalls).toHaveLength(0);
  });
});
