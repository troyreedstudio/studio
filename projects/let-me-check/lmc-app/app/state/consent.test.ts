// Unit tests for the consent helper (SAFE-02).
//
// Vitest runs in node; the Supabase data layer (lib/api) is mocked. We assert the
// onboarding gate records all four required consents (18+, Terms, Privacy, AUP)
// at the shared DOC_VERSION, and that a single-doc accept records just that doc.
// recordConsent also emits consent.accepted to the event log (asserted in api).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordConsent = vi.fn(
  async (_type: string, _docVersion: string, _jurisdiction?: string) => undefined,
);

// The helper lives at app/lib/consent.ts and imports './api'.
vi.mock('../lib/api', () => ({ recordConsent }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lib/consent', () => {
  it('records all four onboarding consents at the shared DOC_VERSION (SAFE-02)', async () => {
    const consent = await import('../lib/consent');
    await consent.recordOnboardingConsents('US');

    const types = recordConsent.mock.calls.map((c) => c[0]);
    expect(types).toEqual(['age_18plus', 'terms', 'privacy', 'aup']);
    for (const call of recordConsent.mock.calls) {
      expect(call[1]).toBe(consent.DOC_VERSION);
      expect(call[2]).toBe('US');
    }
  });

  it('includes age_18plus in the onboarding set', async () => {
    const consent = await import('../lib/consent');
    await consent.recordOnboardingConsents();
    expect(recordConsent.mock.calls.some((c) => c[0] === 'age_18plus')).toBe(true);
  });

  it('recordDocConsent records a single document acceptance', async () => {
    const consent = await import('../lib/consent');
    await consent.recordDocConsent('terms', 'US');
    expect(recordConsent).toHaveBeenCalledTimes(1);
    expect(recordConsent).toHaveBeenCalledWith('terms', consent.DOC_VERSION, 'US');
  });

  it('does not throw when recordConsent rejects (onboarding must not strand)', async () => {
    recordConsent.mockRejectedValueOnce(new Error('network'));
    const consent = await import('../lib/consent');
    await expect(consent.recordOnboardingConsents()).resolves.toBeUndefined();
  });
});
