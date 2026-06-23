# LMC — Full Screen Wiring Audit (2026-06-23)

Every screen audited for: wired to real backend vs mock/dead/broken-route/dev-only. This is the master to-do for "connect everything." Source: 5 parallel audits + this session's device testing.

---

## ✅ SOLID — wired to real backend (no action)
- **Seeker:** payment.tsx (real Stripe hold + createCheck + recordHold), finding.tsx (realtime dispatch), waiting.tsx (realtime + real countdown; map coords fake), delivery.tsx (Mux video + rating + scout + refund), history.tsx (real list; stars gap below), profile.tsx, notifications.tsx, preferred-cities.tsx, recurring.tsx, recurring-setup.tsx, error.tsx
- **Scout:** dashboard, filming, submitted, earnings (totals), withdraw, + new payout-method / verification / tax-documents / personal-info / scout-code (built today)
- **Auth/legal:** auth/sign-in (Apple+Google real), legal/[doc] all 4 docs (consent recorded), index splash
- **Money:** capture-on-delivery (fixed + verified today)

---

## 🔴 TIER 1 — APPLE BLOCKERS (must fix before submission)

1. **flow-map.tsx + dev badges everywhere.** flow-map says "PROTOTYPE · payments + delivery simulated" and is linked FROM THE HOME SCREEN + ~20 screens via orange "WF" / "← FLOW MAP" badges. Auto-reject. → Delete flow-map.tsx; remove every wireframeBadge / router.push('/flow-map') across all screens.
2. **Delete dev screens:** brand-lab.tsx, sound-lab.tsx, font-preview.tsx, chrome-splash.tsx, intro.tsx (orphan/dev routes still in bundle).
3. **payment-methods.tsx** — "ADD NEW CARD" saves a fake Visa 4242; no real card entry. → real Stripe SetupIntent (savePaymentMethod in api.ts exists) OR remove the screen and rely on PaymentSheet.
4. **membership.tsx** — subscription pricing with an Alert stub, no StoreKit. Apple rejects upsell w/o real IAP. → remove from nav for v1 (recommended) or wire StoreKit/RevenueCat.
5. **Onboarding drops user data (CRITICAL):** role flags + display name are NEVER saved to Supabase. role.tsx writes pre-auth → throws silently; quick-finish.tsx never calls setIntendedRoleFlags or updateProfile; PREFILL name/email is hardcoded mock. → in quick-finish.handleFinish (post-auth): setIntendedRoleFlags(role) + updateProfile({displayName}); read prefill from the real session user, not hardcoded.
6. **city.tsx / country.tsx hardcoded Miami/US** (violates "never default Miami") + city.tsx CONTINUE routes an UNAUTHENTICATED user straight into the seeker hub. → real location (permissions.tsx already does GPS+IP fallback correctly — reuse it); gate city behind auth.
7. **Scout funnel doesn't actually make you a Scout:** scout/approved.tsx Scout ID is Math.random() (regenerates each visit), is_scout is never set → completing become-a-scout leaves you a Seeker in the DB. scout/identity.tsx = Alert stub. scout/rules.tsx consent not recorded. → approved: setIntendedRoleFlags('scout') + real Scout ID from server; rules: recordDocConsent('code'); identity: it's covered by Stripe Connect KYC (the new verification screen) — simplify/realign.

## 🟠 TIER 2 — broken / misleading (fix before beta users)
8. **confirmed.tsx** — routes to waiting.tsx with NO checkId (breaks tracking) or is dead code (payment.tsx goes to finding.tsx). Fake Visa. → pass checkId or delete.
9. **report.tsx** — silently discards reports; real requestRefund exists in delivery's sheet. → wire to requestRefund or delete (delivery sheet covers it).
10. **invite.tsx** — hardcoded referral code 'TROY-LMC5'; COPY + all share buttons have NO onPress (dead). → real code from profile, Clipboard + Share APIs, real stats (NET-NEW referrals table) or mark clearly "coming soon".
11. **cancelled.tsx** — "Contact support" dead tap; fake card last4. → real support link (mailto) + real card.
12. **search.tsx** — 84 hardcoded places; ignores real useSavedPlaces/useRecents; saved section always "empty". → real venue search + wire saved/recents.
13. **home.tsx** — fake scout-supply dots (DEMO_BY_MARKET), hardcoded "TR" initials, back→/flow-map. → real supply count (or remove dots), real initials, fix back route.
14. **history.tsx stars** — ratings live in a separate table; CheckRow has no rating → stars always blank. → join/listMyRatings.
15. **saved.tsx coord [0,0]** — saved_places has no coord column → CHECK pins to null island. → add coord column + persist.

## 🟡 TIER 3 — cosmetic / lower (polish or accept for beta)
16. venue.tsx — fake prices/scout count + 900ms setTimeout theatre (payment itself is real). Wire scout count + confirm prices server-authoritative.
17. waiting.tsx + home — map shows fake Miami coords regardless of real venue. Use real coords.
18. scout earnings/profile stats — rating/total_checks/delivery_rate need the scout-earnings Edge fn to return them (currently show "--"). NET-NEW backend fields.
19. preferred-cities scout counts (cosmetic), DOC_VERSION (2026-06-20) vs doc effectiveDate (2026-06-08) mismatch.
20. permissions.tsx — notifications toggle is a fake Alert (no real push token request); `next` param default loops to role. GPS is real.

---

## Suggested execution waves
- **Wave A (Apple-blockers, mostly deletions — low risk):** #1 #2 (flow-map + dev badges + dev screens), #4 (membership out of nav).
- **Wave B (onboarding + scout funnel data persistence — critical correctness):** #5 #6 #7.
- **Wave C (payments + broken routes):** #3 (real card mgmt), #8 #9 #11.
- **Wave D (data wiring):** #12 #13 #14 #15 #18 + #10 (invite).
- **Wave E (cosmetic):** #16 #17 #19 #20.
</content>
</invoke>
