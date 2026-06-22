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

export type { BlurMode, BlurStatus, BlurResult, BlurOptions } from '../../modules/lmc-blur';

/**
 * Blur faces in a recorded clip on-device, returning a result whose `status`
 * tells the caller whether the output is safe to deliver:
 *  - 'blurred'  -> faces blurred, deliver.
 *  - 'no_faces' -> none found, original returned, deliver.
 *  - 'failed'   -> use the fallback, NEVER deliver as if blurred.
 *
 * STEP 1: always resolves { outputPath: inputPath, facesBlurred: 0, status: 'no_faces' }.
 */
export function blurFaces(
  inputPath: string,
  opts?: BlurOptions,
): Promise<BlurResult> {
  return nativeBlurFaces(inputPath, opts);
}
