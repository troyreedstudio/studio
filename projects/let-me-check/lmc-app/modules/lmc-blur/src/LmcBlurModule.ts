import { requireNativeModule } from 'expo';

import type { BlurOptions, BlurResult } from './LmcBlur.types';

// Typed proxy to the native iOS module registered as Name("LmcBlur").
declare class LmcBlurNativeModule {
  blurFaces(inputPath: string, options?: BlurOptions): Promise<BlurResult>;
}

// requireNativeModule throws if the native module is not linked into the binary —
// surfaced cleanly at the Step-1 device build (the whole point of this plan).
const LmcBlurModule = requireNativeModule<LmcBlurNativeModule>('LmcBlur');

export default LmcBlurModule;
