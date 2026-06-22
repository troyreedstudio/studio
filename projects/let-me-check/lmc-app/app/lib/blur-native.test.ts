// Unit tests for the post-record blur fallback chain (08-05).
//
// blurFacesWithFallback is the privacy-critical ordered fallback the upload flow
// uses: gaussian -> retry gaussian -> retry pixelate -> 'failed'. A returned
// 'failed' means the CALLER must route to the server hold and NEVER upload the
// sharp clip as a normal delivery (D-04 / D-07 / T-08-14). These tests assert the
// ORDER and the terminal result; the native module is fully mocked so vitest never
// loads the real lmc-blur (which references RN __DEV__).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BlurResult, BlurOptions } from '../../modules/lmc-blur';

// Mock the native module so requireNativeModule / __DEV__ never run under vitest.
const nativeBlurFaces = vi.fn<(p: string, o?: BlurOptions) => Promise<BlurResult>>();
vi.mock('../../modules/lmc-blur', () => ({
  blurFaces: (p: string, o?: BlurOptions) => nativeBlurFaces(p, o),
}));
// blur-config pulls in nothing native, but mock it so the radius/mode defaults are
// deterministic and independent of the live beta value.
vi.mock('./blur-config', () => ({
  BLUR_POST_RECORD_RADIUS: 70,
  BLUR_POST_RECORD_MODE: 'gaussian',
}));

const ok = (status: BlurResult['status'], outputPath = 'file:///tmp/out.mp4'): BlurResult => ({
  outputPath,
  facesBlurred: status === 'blurred' ? 1 : 0,
  status,
});

beforeEach(() => {
  nativeBlurFaces.mockReset();
});

describe('blurFacesWithFallback ordered fallback', () => {
  it('returns the first gaussian result when it succeeds (no retries)', async () => {
    nativeBlurFaces.mockResolvedValueOnce(ok('blurred'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    expect(res.status).toBe('blurred');
    expect(nativeBlurFaces).toHaveBeenCalledTimes(1);
    expect((nativeBlurFaces.mock.calls[0][1] as BlurOptions)?.mode).toBe('gaussian');
  });

  it("passes through 'no_faces' from the first attempt (original is safe)", async () => {
    nativeBlurFaces.mockResolvedValueOnce(ok('no_faces', '/tmp/in.mp4'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    expect(res.status).toBe('no_faces');
    expect(nativeBlurFaces).toHaveBeenCalledTimes(1);
  });

  it('retries gaussian once on failure, then succeeds', async () => {
    nativeBlurFaces
      .mockResolvedValueOnce(ok('failed'))
      .mockResolvedValueOnce(ok('blurred'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    expect(res.status).toBe('blurred');
    expect(nativeBlurFaces).toHaveBeenCalledTimes(2);
    expect((nativeBlurFaces.mock.calls[1][1] as BlurOptions)?.mode).toBe('gaussian');
  });

  it('falls back to pixelate after two gaussian failures', async () => {
    nativeBlurFaces
      .mockResolvedValueOnce(ok('failed'))
      .mockResolvedValueOnce(ok('failed'))
      .mockResolvedValueOnce(ok('blurred'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    expect(res.status).toBe('blurred');
    expect(nativeBlurFaces).toHaveBeenCalledTimes(3);
    expect((nativeBlurFaces.mock.calls[2][1] as BlurOptions)?.mode).toBe('pixelate');
  });

  it("returns 'failed' when gaussian x2 AND pixelate all fail (caller must hold)", async () => {
    nativeBlurFaces.mockResolvedValue(ok('failed'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    // The privacy contract: a fully-failed chain returns 'failed' so the caller
    // routes to the server hold and NEVER uploads the raw as a normal delivery.
    expect(res.status).toBe('failed');
    expect(nativeBlurFaces).toHaveBeenCalledTimes(3);
  });

  it("treats an unexpected JS throw as 'failed' (never rejects)", async () => {
    nativeBlurFaces.mockRejectedValue(new Error('module not linked'));
    const { blurFacesWithFallback } = await import('./blur-native');
    const res = await blurFacesWithFallback('/tmp/in.mp4');
    expect(res.status).toBe('failed');
    // Three attempts, each caught — the chain resolves 'failed' rather than throwing.
    expect(nativeBlurFaces).toHaveBeenCalledTimes(3);
  });
});
