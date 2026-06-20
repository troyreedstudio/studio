// Wave-0 smoke test: proves the Vitest harness runs and the setup helper loads.
// Later plans replace/augment this with real unit + integration suites.
import { describe, it, expect } from 'vitest';
import { hasSupabaseEnv } from './setup';

describe('wave-0 harness', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });

  it('exposes a Supabase env guard for integration tests', () => {
    expect(typeof hasSupabaseEnv()).toBe('boolean');
  });
});
