// Consent recording helper (SAFE-02).
//
// One place owns the document version + the set of consent types accepted at
// onboarding, so the onboarding screen and the legal-doc viewer can't drift.
// Each recordConsent call writes a versioned `consents` row AND emits a
// `consent.accepted` event to the immutable event log (inside api.recordConsent),
// giving us a server-side, repudiation-proof record of acceptance.

import { recordConsent } from './api';

/** Current version of the legal docs the user is accepting. Bump on any change.
 *  Must match the effectiveDate shown in legal/[doc].tsx so consent records
 *  reference the exact document version the user read. */
export const DOC_VERSION = '2026-06-08';

/** The four acceptances captured at the onboarding 18+/Terms gate. */
export const ONBOARDING_CONSENTS = ['age_18plus', 'terms', 'privacy', 'aup'] as const;

export type ConsentType = (typeof ONBOARDING_CONSENTS)[number] | 'code';

/**
 * Record the full onboarding consent set (18+, Terms, Privacy, AUP). Best-effort:
 * a network hiccup must not strand the user mid-onboarding, so failures are
 * swallowed (the gate is also enforced server-side and re-checked on next launch).
 * Pass the user's market/country as `jurisdiction` when known.
 */
export async function recordOnboardingConsents(jurisdiction?: string): Promise<void> {
  for (const type of ONBOARDING_CONSENTS) {
    try {
      await recordConsent(type, DOC_VERSION, jurisdiction);
    } catch {
      // best-effort; do not block onboarding completion
    }
  }
}

/** Record a single document acceptance from the legal viewer's Accept button. */
export async function recordDocConsent(
  type: ConsentType,
  jurisdiction?: string,
): Promise<void> {
  try {
    await recordConsent(type, DOC_VERSION, jurisdiction);
  } catch {
    // best-effort
  }
}
