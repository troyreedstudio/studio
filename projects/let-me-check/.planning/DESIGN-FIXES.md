# LMC — Design Fixes (running list)

Visual/UX polish to do in the dedicated **design + color-scheme redesign pass** (functionality is built + working; these are look/feel/consistency). Add to this as we find more.

## Cross-cutting (whole app)
- **Consistent visual language across screens.** Big jarring transitions: delivery's black/green poster ↔ waiting's satellite map ↔ green/blue "finding a scout". Pick one design system (color, type, motion) and apply throughout so screens don't feel like different apps.
- **Brand wording:** use the full **"Let Me Check"** wordmark on user-facing chrome; "LMC" is shorthand only. (Fixed on the waiting sheet; sweep the rest.)
- **Futuristic/mono font** for numeric/hero elements (timers, stats) to match the Let Me Check logo feel.
- **Load-flicker on settings screens** (Notifications, Preferred Cities, onboarding): they render default/old values for a split second, then snap to saved data. Fix = hold render until saved data loads (don't flash defaults). [Functional persistence already works.]

## Seeker — Waiting screen (`(seeker)/waiting.tsx`)
- Layout is "messy": blue pill, "Paid / Assigned" steps, status text all competing. Needs a clean redesign.
- Countdown timer looks "small + silly" — make it the **hero**, in the futuristic/mono font, properly sized.
- Repetition: "Scout on site" appears twice (label + under brand). Tighten copy.
- The "finding a Scout" (green/blue) state vs the assigned map state feel like different screens — unify.
- Decide what the timer represents at each phase (scout-to-site ETA vs filming window vs delivery ETA) and label clearly.

## Seeker — Delivery screen (`(seeker)/delivery.tsx`)
- Color/layout tweaks (Troy flagged, deferred to redesign).
- Branded poster + hero video are good; refine within the design system.
- (Optional) tap-the-video-to-fullscreen behavior.

## Scout — Filming screen (`(scout)/filming.tsx`)
- File is 695 lines — extract HUD/steps into sub-components (also helps the <500-line rule).
- On-device blur shape: square → **soft oval / feathered** mask (the CIRadialGradient attempt crashed; revisit).

## Notes
- This list is design-only. Functional gaps + the Apple submission steps live in DEVICE-TEST-CHECKLIST.md + APPLE-SUBMISSION-CHECKLIST.md.
