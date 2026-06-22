// lmc-blur — local Expo module (iOS-first). Post-record on-device face blur.
//
// STEP 1 (this plan) = NO-OP: blurFaces resolves with the input path and
// status 'no_faces'. Real Vision/CoreImage/AVFoundation blur arrives in Plans 02-04.
//
// Android: deferred fast-follow after the iOS beta (08-CONTEXT D-03). The native
// module is iOS-only for now; calling blurFaces on Android would throw at
// requireNativeModule. Android (MediaCodec + ML Kit) is a TODO for a later phase.

import LmcBlurModule from './src/LmcBlurModule';
import type { BlurOptions, BlurResult } from './src/LmcBlur.types';

export type { BlurMode, BlurStatus, BlurResult, BlurOptions } from './src/LmcBlur.types';

export function blurFaces(
  inputPath: string,
  opts?: BlurOptions,
): Promise<BlurResult> {
  return LmcBlurModule.blurFaces(inputPath, opts);
}

export default LmcBlurModule;
