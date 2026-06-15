# Flow Map — V1 "FULL" flow (archived 2026-06-15)

Removed from `app/flow-map.tsx` because the Flow Map dev screen defaulted to this
V1 FULL view during testing, which was confusing. **We ship V2 Lean.** This file
preserves the V1 FULL step definitions so they can be restored if ever needed.

To restore: paste these arrays back into `flow-map.tsx` and re-add the
`version` ('full' | 'lean') toggle that selected between them.

## FULL_SEEKER (14 steps)

```ts
const FULL_SEEKER: Step[] = [
  { num: 1, name: 'Splash', desc: 'Chrome LMC boot · chime · 4 sec auto-advance', route: '/', status: 'BUILT' },
  { num: 2, name: 'Welcome', desc: 'Brand mark + tagline + GET STARTED · Sign in', route: '/welcome', status: 'BUILT' },
  { num: 3, name: 'Intro Carousel', desc: '3 slides · Real Eyes / Right Now / Anywhere', route: '/intro', status: 'BUILT' },
  { num: 4, name: 'Sign Up — Method', desc: 'Apple · Google · Phone', route: '/auth/sign-up', status: 'BUILT' },
  { num: 5, name: 'Sign In (returning users)', desc: 'Apple · Google · Phone OTP → /onboarding/welcome-back', route: '/auth/sign-in', status: 'BUILT' },
  { num: 6, name: 'Welcome Back', desc: 'Returning-user role picker · Seeker → home / Scout → dashboard', route: '/onboarding/welcome-back', status: 'BUILT' },
  { num: 7, name: 'Phone + OTP', desc: 'Number entry → SMS code (Phone path only)', route: '/auth/sign-up', status: 'BUILT' },
  { num: 8, name: 'Personal Info (Seeker)', desc: 'Name · email · phone verified pill · "I am 18+" checkbox + bundled consent (Terms · Privacy · AUP). NO DOB / SSN / bank — that all lives in the Scout flow only.', route: '/onboarding/personal-info', status: 'BUILT' },
  { num: 9, name: 'Rules / Acceptable Use', desc: 'Acceptable use + Terms + Privacy checkboxes', route: '/auth/sign-up', status: 'BUILT' },
  { num: 10, name: 'Permissions', desc: 'Location (REQUIRED) + Notifications (RECOMMENDED) · iOS-style prompts · if-denied warnings · iOS Settings deeplink', route: '/onboarding/permissions', status: 'BUILT' },
  { num: 11, name: 'Choose Your Path', desc: 'Seeker vs Scout vs Both · ALL routes go through /auth/sign-up now (Scout no longer skips auth)', route: '/onboarding/role', status: 'BUILT' },
  { num: 12, name: 'Seeker Home', desc: 'Map + bottom sheet · browse + request a check', route: '/(seeker)/home', status: 'BUILT' },
  { num: 13, name: 'Legal docs', desc: 'Terms · Privacy · AUP · Scout Code — reachable from consent links anywhere in onboarding', route: '/legal/terms', status: 'BUILT' },
  { num: 14, name: 'Payment (at checkout)', desc: 'Stripe Payment Sheet — built inline on payment.tsx, slides up from bottom · saves card via shared state', route: '/(seeker)/payment', status: 'BUILT' },
];
```

## FULL_SCOUT (9 steps)

Note: in V1, `LEAN_SCOUT = FULL_SCOUT` (the Scout flow was not trimmed between
versions). On removal, these steps were kept as the sole Scout flow in V2.

```ts
const FULL_SCOUT: Step[] = [
  // ===== ONBOARDING =====
  { num: 1, name: 'Become a Scout', desc: 'Entry from Choose Path or Seeker profile · explains the ~10 min flow · all 4 step rows tappable', route: '/scout/become', status: 'BUILT' },
  { num: 2, name: 'Identity Verification', desc: 'ID-type selector · front/back/selfie slots · consent gate · Stripe Identity handoff', route: '/scout/identity', status: 'BUILT' },
  { num: 3, name: 'Configure Payouts', desc: 'Speed selector · earnings preview · tax + trust · Stripe Connect handoff', route: '/scout/payout', status: 'BUILT' },
  { num: 4, name: 'The Scout Code', desc: 'Code of Conduct · sidewalks · safety · audio · QUALITY STANDARDS (rejection = no pay) · dual gate (CONSENT + AGREE)', route: '/scout/rules', status: 'BUILT' },
  { num: 5, name: 'Approved', desc: 'Chrome ✓ hero · Scout ID card · on-file checklist · unlocked perks · first steps · reminders + support', route: '/scout/approved', status: 'BUILT' },
  // ===== OPERATIONAL =====
  { num: 6, name: 'Scout Dashboard', desc: 'Top bar back · online toggle · auto-rotating incoming requests (5-venue pool) · reactive today\'s earnings · 4-tab nav', route: '/(scout)/dashboard', status: 'BUILT' },
  { num: 7, name: 'Filming + Camera', desc: 'Premium white record button (breathing halo) · simulated camera viewfinder · GPS/MIC pills · CAPTURED green flash at 15s · STOP & RETAKE label · 3-take retake decision card', route: '/(scout)/filming', status: 'BUILT' },
  { num: 8, name: 'Upload + Submitted', desc: 'Visible upload progress (UPLOADING → VERIFYING → DELIVERED) · 4-step status timeline · earnings flip PENDING → CLEARED · cleared-payment toast · Quality Standards reminder', route: '/(scout)/submitted', status: 'BUILT' },
  { num: 9, name: 'Earnings Dashboard', desc: 'THIS MONTH indigo card · weekly bar chart with today highlighted · ALL TIME stats · payouts list (gold PENDING / green PAID) · indigo Withdraw card', route: '/(scout)/earnings', status: 'BUILT' },
];
```
