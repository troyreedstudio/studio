// supabase/functions/_shared/pricing.ts
// LMC Phase 4 — Payments: the SINGLE source of tier money for Edge Functions.
// All amounts are in MINOR UNITS (cents). Currency is per-tier so future markets
// can override via a market config module without editing any call site.
// Never import this from the client — amounts are server-authoritative (T-04-06).

/**
 * The two check tiers a Seeker can book. Must match the `tier` enum in the DB
 * (checks.tier CHECK constraint in migration 0004).
 */
export type Tier = 'standard' | 'priority';

/**
 * Server-authoritative tier pricing in MINOR UNITS (e.g., 1650 = $16.50 USD).
 *
 * seekerTotal — total charged to the Seeker (product price + platform fee).
 * scoutAmount — Scout's share, transferred after capture (D-04/D-05).
 * currency    — ISO 4217 lower-case; per-tier so future markets can swap to
 *               local currency without touching call sites.
 *
 * Standard:  $16.50 seeker → $8.00 Scout  → $8.50 LMC margin
 * Priority:  $22.00 seeker → $12.00 Scout → $10.00 LMC margin
 */
export const TIER_PRICING: Record<
  Tier,
  { seekerTotal: number; scoutAmount: number; currency: string }
> = {
  standard: { seekerTotal: 1650, scoutAmount: 800, currency: 'usd' },
  priority: { seekerTotal: 2200, scoutAmount: 1200, currency: 'usd' },
};

/**
 * Look up pricing for a tier string received from the client.
 * Validates the input is a known tier and throws `"unknown tier: <value>"` if not,
 * so the caller can map the error to a 400 response.
 *
 * Returns { seekerTotal, scoutAmount, currency } in minor units.
 * Amount authority stays server-side: no client value is ever trusted here.
 */
export function priceForTier(
  tier: string,
): { seekerTotal: number; scoutAmount: number; currency: string } {
  if (tier in TIER_PRICING) {
    return TIER_PRICING[tier as Tier];
  }
  throw new Error(`unknown tier: ${tier}`);
}
