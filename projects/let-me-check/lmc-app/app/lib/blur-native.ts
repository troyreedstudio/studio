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
