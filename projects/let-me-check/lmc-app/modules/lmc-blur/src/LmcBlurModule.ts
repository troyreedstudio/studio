import { requireOptionalNativeModule } from 'expo';

import type { BlurOptions, BlurResult } from './LmcBlur.types';

// Typed proxy to the native iOS module registered as Name("LmcBlur").
declare class LmcBlurNativeModule {
  blurFaces(inputPath: string, options?: BlurOptions): Promise<BlurResult>;
}

// OPTIONAL require: returns null when the native module isn't in the binary
// (Android — lmc-blur is iOS-only for now). This MUST NOT throw at import time:
// any screen that transitively imports this (e.g. the Seeker delivery screen via
// clips.ts) would otherwise crash on Android with "Cannot find native module
// 'LmcBlur'". Callers guard the null (see ../index.ts blurFaces).
const LmcBlurModule = requireOptionalNativeModule<LmcBlurNativeModule>('LmcBlur');

export default LmcBlurModule;
