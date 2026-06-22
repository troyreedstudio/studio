// Thin app-facing wrapper around the local `lmc-blur` Expo module.
//
// This is the ONLY import path the app uses for face blur — it decouples app
// code from the native module package, so the wiring in Step 5 imports from here,
// not from modules/lmc-blur directly.
//
// STEP 1 = no-op; faces are blurred from Step 3 on. Never wired into upload until
// Step 5 (flag-gated). Nothing in the recording/upload flow calls this yet.

import { blurFaces as nativeBlurFaces } from '../../modules/lmc-blur';
import type { BlurOptions, BlurResult } from '../../modules/lmc-blur';
import { BLUR_POST_RECORD_RADIUS, BLUR_POST_RECORD_MODE } from './blur-config';

export type { BlurMode, BlurStatus, BlurResult, BlurOptions } from '../../modules/lmc-blur';

/**
 * Blur faces in a recorded clip on-device, returning a result whose `status`
 * tells the caller whether the output is safe to deliver:
 *  - 'blurred'  -> faces blurred, deliver.
 *  - 'no_faces' -> none found, original returned, deliver.
 *  - 'failed'   -> use the fallback, NEVER deliver as if blurred.
 *
 * STEP 3: faces are now actually blurred by the native module. The post-record
 * radius/mode defaults (blur-config.ts) are applied unless the caller overrides
 * them. Still NOT wired into the upload flow — Step 5 adds that behind a flag.
 */
export function blurFaces(
  inputPath: string,
  opts?: BlurOptions,
): Promise<BlurResult> {
  const merged: BlurOptions = {
    radius: opts?.radius ?? BLUR_POST_RECORD_RADIUS,
    mode: opts?.mode ?? BLUR_POST_RECORD_MODE,
  };
  return nativeBlurFaces(inputPath, merged);
}

/**
 * STEP 5 (08-05): the privacy-safe ordered fallback the upload flow uses.
 *
 * Per 06-RESEARCH-BLUR-V2 "Fallback" section, in order:
 *   1. gaussian (the default, strongest) — try once.
 *   2. on 'failed', retry gaussian once (transient codec/memory failures often
 *      pass on a second attempt).
 *   3. still 'failed' → retry in PIXELATE mode (cheaper / more robust path).
 *
 * Returns the FINAL BlurResult. A returned status of 'failed' here means BOTH the
 * gaussian retry AND the pixelate retry failed — the CALLER (clips.ts submit())
 * must then route the clip to the dormant server-side detect-and-hold and NEVER
 * upload the sharp file as a normal delivery (Pitfall 5 / D-04 / T-08-14).
 *
 * Note: blurFaces NEVER throws for a blur failure — it resolves with status
 * 'failed' (the native module returns the input path on any pipeline error). The
 * try/catch here only guards an unexpected JS-side throw (e.g. module not linked)
 * so the fallback chain still resolves a 'failed' result rather than rejecting.
 */
export async function blurFacesWithFallback(
  inputPath: string,
): Promise<BlurResult> {
  const failed = (): BlurResult => ({
    outputPath: inputPath,
    facesBlurred: 0,
    status: 'failed',
  });

  const attempt = async (opts?: BlurOptions): Promise<BlurResult> => {
    try {
      return await blurFaces(inputPath, opts);
    } catch {
      return failed();
    }
  };

  // 1. gaussian (default).
  let result = await attempt({ mode: 'gaussian' });
  if (result.status !== 'failed') return result;

  // 2. retry gaussian once.
  result = await attempt({ mode: 'gaussian' });
  if (result.status !== 'failed') return result;

  // 3. retry pixelate (cheaper / more robust).
  result = await attempt({ mode: 'pixelate' });
  return result; // 'blurred' | 'no_faces' | 'failed' — caller handles 'failed'.
}
