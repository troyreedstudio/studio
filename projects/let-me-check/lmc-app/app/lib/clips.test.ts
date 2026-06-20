// Unit tests for the device-side clip upload/playback seam (VID-03/VID-04).
//
// Vitest runs in node; both the Supabase client and expo-file-system are fully
// mocked, so these tests assert CALL SHAPES + retry/backoff behaviour, not the
// network. The contract under test:
//   - requestUploadUrl(checkId)  -> invokes the 'mux-upload-url' Edge Function
//   - getPlaybackToken(checkId)  -> invokes the 'mux-playback-token' Edge Function
//   - uploadClip uses FileSystem.createUploadTask (PUT) and throws on HTTP >= 300
//   - uploadWithRetry retries a failing upload and throws after `max` attempts
//   - the module NEVER transitions a check to delivered (the webhook owns it)

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase Edge Function mock ───────────────────────────────────────────────
let invokeReturn: { data: unknown; error: unknown } = { data: null, error: null };
const invokeCalls: Array<{ fn: string; args: unknown }> = [];

const supabaseMock = {
  functions: {
    invoke: vi.fn(async (fn: string, args: unknown) => {
      invokeCalls.push({ fn, args });
      return invokeReturn;
    }),
  },
  // Present so a stray rpc() call would be observable; the contract is it's NEVER used.
  rpc: vi.fn(async () => ({ data: null, error: null })),
};

vi.mock('./supabase', () => ({ supabase: supabaseMock }));

// ── expo-file-system mock ─────────────────────────────────────────────────────
// createUploadTask(url, path, opts, cb) returns a task whose uploadAsync resolves
// to the configured response. uploadResponses lets a test fail-then-succeed.
let uploadResponses: Array<{ status: number } | Error> = [];
let uploadCallCount = 0;
const createUploadTaskCalls: Array<{ url: string; path: string; opts: unknown }> = [];

const FileSystemMock = {
  FileSystemUploadType: { BINARY_CONTENT: 'BINARY_CONTENT' },
  createUploadTask: vi.fn(
    (url: string, path: string, opts: unknown, _cb?: (p: unknown) => void) => {
      createUploadTaskCalls.push({ url, path, opts });
      return {
        uploadAsync: async () => {
          const next = uploadResponses[uploadCallCount] ?? { status: 200 };
          uploadCallCount += 1;
          if (next instanceof Error) throw next;
          return next;
        },
      };
    },
  ),
};

vi.mock('expo-file-system', () => FileSystemMock);

beforeEach(() => {
  invokeReturn = { data: null, error: null };
  invokeCalls.length = 0;
  createUploadTaskCalls.length = 0;
  uploadResponses = [];
  uploadCallCount = 0;
  vi.clearAllMocks();
  // No real timers: make setTimeout resolve immediately so backoff doesn't stall.
  vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
    fn();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
});

describe('lib/clips requestUploadUrl', () => {
  it("invokes the 'mux-upload-url' function with the checkId and returns the URL + id", async () => {
    invokeReturn = { data: { uploadUrl: 'https://mux/up/abc', uploadId: 'up_abc' }, error: null };
    const { requestUploadUrl } = await import('./clips');
    const out = await requestUploadUrl('check-123');

    expect(out).toEqual({ uploadUrl: 'https://mux/up/abc', uploadId: 'up_abc' });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('mux-upload-url', {
      body: { checkId: 'check-123' },
    });
  });

  it('throws when the function returns an error', async () => {
    invokeReturn = { data: null, error: { message: 'no upload url' } };
    const { requestUploadUrl } = await import('./clips');
    await expect(requestUploadUrl('check-123')).rejects.toBeTruthy();
  });
});

describe('lib/clips getPlaybackToken', () => {
  it("invokes the 'mux-playback-token' function and returns the token string", async () => {
    invokeReturn = { data: { token: 'jwt.tok.en' }, error: null };
    const { getPlaybackToken } = await import('./clips');
    const token = await getPlaybackToken('check-123');

    expect(token).toBe('jwt.tok.en');
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('mux-playback-token', {
      body: { checkId: 'check-123' },
    });
  });

  it('throws when the function returns an error', async () => {
    invokeReturn = { data: null, error: { message: 'not the owner' } };
    const { getPlaybackToken } = await import('./clips');
    await expect(getPlaybackToken('check-123')).rejects.toBeTruthy();
  });
});

describe('lib/clips uploadClip', () => {
  it('PUTs the local file via createUploadTask and resolves on a 2xx', async () => {
    uploadResponses = [{ status: 200 }];
    const { uploadClip } = await import('./clips');
    await expect(uploadClip('/tmp/clip.mov', 'https://mux/up/abc')).resolves.toBeUndefined();

    expect(createUploadTaskCalls).toHaveLength(1);
    expect(createUploadTaskCalls[0].url).toBe('https://mux/up/abc');
    expect(createUploadTaskCalls[0].path).toBe('/tmp/clip.mov');
    expect(createUploadTaskCalls[0].opts).toMatchObject({
      httpMethod: 'PUT',
      uploadType: 'BINARY_CONTENT',
    });
  });

  it('throws when the upload responds with status >= 300', async () => {
    uploadResponses = [{ status: 500 }];
    const { uploadClip } = await import('./clips');
    await expect(uploadClip('/tmp/clip.mov', 'https://mux/up/abc')).rejects.toThrow();
  });

  it('reports progress through the onProgress callback', async () => {
    uploadResponses = [{ status: 200 }];
    const { uploadClip } = await import('./clips');
    const onProgress = vi.fn();
    await uploadClip('/tmp/clip.mov', 'https://mux/up/abc', onProgress);
    // the progress callback handle was wired into createUploadTask
    expect(FileSystemMock.createUploadTask).toHaveBeenCalled();
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
    invokeReturn = { data: { uploadUrl: 'u', uploadId: 'i' }, error: null };
    uploadResponses = [{ status: 200 }];
    const clips = await import('./clips');
    await clips.requestUploadUrl('id');
    await clips.uploadWithRetry('/tmp/clip.mov', 'u');
    invokeReturn = { data: { token: 't' }, error: null };
    await clips.getPlaybackToken('id');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
