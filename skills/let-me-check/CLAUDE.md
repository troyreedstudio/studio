# Let Me Check — Skill

## Brand

- **Name**: Let Me Check (LMC)
- **Concept**: On-demand nightlife venue video verification — see the vibe before you arrive
- **Audience**: Nightlife-goers (21-35) who want real-time proof of a venue's atmosphere before committing
- **Tone**: Urban, confident, premium but accessible

## Tech Stack

- **Mobile app**: React Native 0.83.2 + Expo 54 + TypeScript 5.9
- **Routing**: Expo Router (file-based) with grouped routes `(user)/` and `(checker)/`
- **Styling**: Dark theme (`#000` bg, `#22c55e` green accent, `#f59e0b` amber accent)
- **State**: Local component state (no global state management yet)
- **Data**: Mock data embedded in components (no API layer yet)
- **Code location**: `projects/let-me-check/lmc-app/`
- **Docs**: Business plan, pitch decks in `projects/let-me-check/docs/`
- **Assets**: Logos, app screenshots, trailer video/VO in `projects/let-me-check/`

## Current Phase

**MVP/Prototype complete** — all UI flows are built and functional with mock data. No backend integration. Ready for next phase.

## Goals

1. Backend integration: auth, Stripe payments, real-time notifications, camera, geolocation
2. Build out Checker onboarding and verification flow
3. Beta launch in one target city

## Pricing Model

- Standard tier: $15 + $1.50 platform fee = $16.50
- Priority tier: $20 + $2.00 platform fee = $22.00
- Checker payout: $8-13 per check
