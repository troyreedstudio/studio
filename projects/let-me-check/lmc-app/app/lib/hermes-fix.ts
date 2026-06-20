// hermes-fix.ts — imported FIRST in the root layout, before anything renders.
//
// Two device-release hardening shims:
//
// 1) Hermes (release, on a physical device) throws "Cannot add new property
//    'name'" inside React's `describeNativeComponentFrame` when it does
//    `Object.defineProperty(fn, 'name', …)` on an optimized function whose
//    `name` is non-configurable. That throw happens WHILE React is building the
//    component stack for a *different* error — so it MASKS the real error and
//    hard-crashes the app. We make that one specific defineProperty failure a
//    no-op so the genuine error surfaces (and the app stops hard-crashing while
//    formatting an error). This is a no-op on the Simulator/dev where it works.
const _defineProperty = Object.defineProperty;
Object.defineProperty = function (target: object, key: PropertyKey, attrs: PropertyDescriptor) {
  try {
    return _defineProperty(target, key, attrs);
  } catch (err) {
    // Only swallow the benign name/length re-decoration that breaks stack-building.
    if (key === 'name' || key === 'length') return target;
    throw err;
  }
} as typeof Object.defineProperty;

// 2) Surface the REAL error in native logs (idevicesyslog) instead of a silent
//    crash, so device-only failures are diagnosable. Chains the existing handler.
type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
const g = globalThis as unknown as {
  ErrorUtils?: {
    getGlobalHandler?: () => GlobalErrorHandler;
    setGlobalHandler?: (h: GlobalErrorHandler) => void;
  };
};
if (g.ErrorUtils?.setGlobalHandler) {
  const previous = g.ErrorUtils.getGlobalHandler?.();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    const e = error as { message?: string; stack?: string } | undefined;
    // Tagged so it is greppable in device logs.
    console.error(`[LMC-FATAL] isFatal=${isFatal} ${e?.message ?? error}`);
    if (e?.stack) console.error(`[LMC-FATAL-STACK] ${e.stack}`);
    previous?.(error, isFatal);
  });
}

export {};
