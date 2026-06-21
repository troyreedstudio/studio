// Unit tests for the device-side clip upload/playback seam (VID-03/VID-04).
//
// Vitest runs in node; fetch, supabase.auth, and expo-file-system/legacy are
// fully mocked so these tests assert CALL SHAPES + retry/backoff behaviour,
// not the network. The contract under test:
//   - requestUploadUrl(checkId, gps?, fraudSignals?) -> calls invokeEdgeFunction
//     which calls fetch('mux-upload-url') — asserts the body shape
//   - getPlaybackToken(checkId) -> calls invokeEdgeFunction('mux-playback-token')
//   - uploadClip uses uploadAsync (PUT) and throws on HTTP >= 300
//   - uploadWithRetry retries a failing upload and throws after `max` attempts
//   - the module NEVER transitions a check to delivered (the webhook owns it)
//   - Phase 6 (FRAUD-03): requestUploadUrl forwards fraud_signals in the body

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase auth mock (for invokeEdgeFunction session lookup) ────────────────
const supabaseMock = {
  auth: {
    getSession: vi.fn(async () => ({
      data: { session: { access_token: 'test-token' } },
    })),
  },
  // Present so a stray rpc() call would be observable; the contract is it's NEVER used.
  rpc: vi.fn(async () => ({ data: null, error: null })),
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

// ── Config mock ───────────────────────────────────────────────────────────────
vi.mock('./config', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

// ── Global fetch mock ─────────────────────────────────────────────────────────
// invokeEdgeFunction uses plain fetch (not supabase.functions.invoke).
// Each test configures fetchResponses to control what fetch returns.
type FetchResponse = { ok: boolean; status: number; body: unknown };
let fetchResponses: Array<FetchResponse | Error> = [];
let fetchCallCount = 0;
const fetchCalls: Array<{ url: string; init: RequestInit }> = [];

vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
  fetchCalls.push({ url, init });
  const next = fetchResponses[fetchCallCount] ?? { ok: true, status: 200, body: {} };
  fetchCallCount += 1;
  if (next instanceof Error) throw next;
  const body = next.body;
  return {
    ok: next.ok,
    status: next.status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}));

// ── expo-file-system/legacy mock (uploadAsync API — Phase 5 refactor) ────────
// clips.ts uses uploadAsync (not createUploadTask). uploadResponses lets a test
// fail-then-succeed to verify the retry loop.
let uploadResponses: Array<{ status: number } | Error> = [];
let uploadCallCount = 0;

const FileSystemMock = {
  FileSystemUploadType: { BINARY_CONTENT: 'BINARY_CONTENT' },
  uploadAsync: vi.fn(async (_url: string, _path: string, _opts: unknown) => {
    const next = uploadResponses[uploadCallCount] ?? { status: 200 };
    uploadCallCount += 1;
    if (next instanceof Error) throw next;
    return next;
  }),
  getInfoAsync: vi.fn(async () => ({ exists: true, size: 1024 })),
};

vi.mock('expo-file-system/legacy', () => FileSystemMock);

beforeEach(() => {
  fetchResponses = [];
  fetchCallCount = 0;
  fetchCalls.length = 0;
  uploadResponses = [];
  uploadCallCount = 0;
  vi.clearAllMocks();
  // Reset auth mock after clearAllMocks
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
  // No real timers: make setTimeout resolve immediately so backoff doesn't stall.
  vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
    fn();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
});

describe('lib/clips requestUploadUrl', () => {
  it("calls mux-upload-url via fetch with the checkId and returns the URL + id", async () => {
    fetchResponses = [{ ok: true, status: 200, body: { uploadUrl: 'https://mux/up/abc', uploadId: 'up_abc' } }];
    const { requestUploadUrl } = await import('./clips');
    const out = await requestUploadUrl('check-123');

    expect(out).toEqual({ uploadUrl: 'https://mux/up/abc', uploadId: 'up_abc' });
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toContain('mux-upload-url');
    const sentBody = JSON.parse(fetchCalls[0].init.body as string);
    expect(sentBody.checkId).toBe('check-123');
  });

  it('throws when the function returns a non-OK response', async () => {
    fetchResponses = [{ ok: false, status: 403, body: 'forbidden' }];
    const { requestUploadUrl } = await import('./clips');
    await expect(requestUploadUrl('check-123')).rejects.toThrow();
  });

  it('forwards gps fields in the request body (Phase 5, VER-01)', async () => {
    fetchResponses = [{ ok: true, status: 200, body: { uploadUrl: 'u', uploadId: 'i' } }];
    const { requestUploadUrl } = await import('./clips');
    await requestUploadUrl('check-123', { lat: 25.77, lng: -80.19, accuracyM: 12 });

    const sentBody = JSON.parse(fetchCalls[0].init.body as string);
    expect(sentBody.filmed_lat).toBe(25.77);
    expect(sentBody.filmed_lng).toBe(-80.19);
    expect(sentBody.filmed_accuracy_m).toBe(12);
  });

  it('forwards fraud_signals in the request body when provided (Phase 6, FRAUD-03)', async () => {
    fetchResponses = [{ ok: true, status: 200, body: { uploadUrl: 'u', uploadId: 'i' } }];
    const { requestUploadUrl } = await import('./clips');
    const signals = { accuracy_is_exact: false, location_accuracy_m: 12, collection_ts: '2026-01-01T00:00:00Z', is_simulated_by_software: null };
    await requestUploadUrl('check-123', undefined, signals as Record<string, unknown>);

    const sentBody = JSON.parse(fetchCalls[0].init.body as string);
    expect(sentBody.fraud_signals).toEqual(signals);
  });

  it('omits fraud_signals from the body when not provided (no spurious null)', async () => {
    fetchResponses = [{ ok: true, status: 200, body: { uploadUrl: 'u', uploadId: 'i' } }];
    const { requestUploadUrl } = await import('./clips');
    await requestUploadUrl('check-123');

    const sentBody = JSON.parse(fetchCalls[0].init.body as string);
    expect(sentBody).not.toHaveProperty('fraud_signals');
  });
});

describe('lib/clips getPlaybackToken', () => {
  it("calls mux-playback-token via fetch and returns the token string", async () => {
    fetchResponses = [{ ok: true, status: 200, body: { token: 'jwt.tok.en' } }];
    const { getPlaybackToken } = await import('./clips');
    const token = await getPlaybackToken('check-123');

    expect(token).toBe('jwt.tok.en');
    expect(fetchCalls[0].url).toContain('mux-playback-token');
    const sentBody = JSON.parse(fetchCalls[0].init.body as string);
    expect(sentBody.checkId).toBe('check-123');
  });

  it('throws when the function returns a non-OK response', async () => {
    fetchResponses = [{ ok: false, status: 403, body: 'not the owner' }];
    const { getPlaybackToken } = await import('./clips');
    await expect(getPlaybackToken('check-123')).rejects.toThrow();
  });
});

describe('lib/clips uploadClip', () => {
  it('PUTs the local file via uploadAsync and resolves on a 2xx', async () => {
    uploadResponses = [{ status: 200 }];
    const { uploadClip } = await import('./clips');
    await expect(uploadClip('/tmp/clip.mov', 'https://mux/up/abc')).resolves.toBeUndefined();

    expect(FileSystemMock.uploadAsync).toHaveBeenCalledWith(
      'https://mux/up/abc',
      'file:///tmp/clip.mov',
      expect.objectContaining({ httpMethod: 'PUT', uploadType: 'BINARY_CONTENT' }),
    );
  });

  it('throws when the upload responds with status >= 300', async () => {
    uploadResponses = [{ status: 500 }];
    const { uploadClip } = await import('./clips');
    await expect(uploadClip('/tmp/clip.mov', 'https://mux/up/abc')).rejects.toThrow();
  });

  it('accepts an onProgress callback without throwing', async () => {
    uploadResponses = [{ status: 200 }];
    const { uploadClip } = await import('./clips');
    const onProgress = vi.fn();
    await expect(uploadClip('/tmp/clip.mov', 'https://mux/up/abc', onProgress)).resolves.toBeUndefined();
    // Progress callback is called (at minimum with 1 at completion)
    expect(onProgress).toHaveBeenCalledWith(1);
  });
});

describe('lib/clips uploadWithRetry', () => {
  it('retries a failing upload and eventually succeeds', async () => {
    uploadResponses = [new Error('network'), new Error('network'), { status: 200 }];
    const { uploadWithRetry } = await import('./clips');
    await expect(uploadWithRetry('/tmp/clip.mov', 'https://mux/up/abc', 4)).resolves.toBeUndefined();
    // 3 attempts total (2 failures + 1 success)
    expect(uploadCallCount).toBe(3);
  });

  it('throws after exhausting max attempts', async () => {
    uploadResponses = [
      new Error('network'),
      new Error('network'),
      new Error('network'),
      new Error('network'),
    ];
    const { uploadWithRetry } = await import('./clips');
    await expect(uploadWithRetry('/tmp/clip.mov', 'https://mux/up/abc', 4)).rejects.toThrow();
    expect(uploadCallCount).toBe(4);
  });
});

describe('lib/clips VID-03 invariant', () => {
  it('NEVER calls supabase.rpc (no client-side transition_check / delivered)', async () => {
    fetchResponses = [
      { ok: true, status: 200, body: { uploadUrl: 'u', uploadId: 'i' } },
      { ok: true, status: 200, body: { token: 't' } },
    ];
    uploadResponses = [{ status: 200 }];
    const clips = await import('./clips');
    await clips.requestUploadUrl('id');
    await clips.uploadWithRetry('/tmp/clip.mov', 'u');
    await clips.getPlaybackToken('id');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
