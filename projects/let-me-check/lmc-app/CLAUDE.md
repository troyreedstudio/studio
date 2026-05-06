# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Let Me Check (LMC)** — universal visual verification on demand. Seekers pay to have a Scout (a real person on the ground) film a 30-second clip of any location anywhere. Phase 1 launch: nightlife wedge in Miami, "Know Before You Go." Long-term vision: any location on earth (DMV queues, airports, restaurants, real estate, hotels, gyms, retail, events, beach clubs, etc.).

Two roles, both as separate route groups in Expo Router:
- **Seekers** — browse venues, request checks, pay, watch delivered clips
- **Scouts** — accept nearby requests, film clips, earn money ($8 standard, $12 priority)

A single account holds both roles (Uber-style toggle); a Seeker can become a Scout and vice versa.

## Commands

All commands run from this directory (`lmc-app/`):

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
```

No test, lint, or build scripts are configured yet.

## Architecture

- **Framework**: React Native 0.83.2 + Expo 54 + TypeScript 5.9
- **Routing**: Expo Router (file-based) with grouped routes `(seeker)/` and `(scout)/`
- **State**: Local component state only (no Redux/Zustand). Inter-screen data passes via route params (`useLocalSearchParams`)
- **Styling**: `StyleSheet.create()` with a dark theme (`#000` background, `#22c55e` green accent, `#f59e0b` amber accent, `#fff`/`#888`/`#555` text hierarchy, `#1e1e1e`-`#333` borders)
- **Data**: All mock data is embedded directly in screen components (no API layer yet)

### Routing Structure

```
app/
  _layout.tsx          # Root Stack navigator (black theme)
  index.tsx            # Splash / role selection screen
  (seeker)/
    _layout.tsx        # Seeker stack layout
    home.tsx           # Venue browsing, search, city filters
    venue.tsx          # Venue detail, tier selection
    payment.tsx        # Order summary, fee breakdown
    waiting.tsx        # Countdown + delivery progress
    delivery.tsx       # Video player, rating, Scout info
    history.tsx        # Past checks, stats
    profile.tsx        # Account settings, referrals, switch to Scout mode
  (scout)/
    _layout.tsx        # Scout stack layout
    dashboard.tsx      # Online toggle, incoming requests, earnings
    filming.tsx        # Recording UI, countdown, GPS badge
    submitted.tsx      # Success confirmation, clip stats
    earnings.tsx       # Weekly chart, payouts, withdraw
```

### Flows

**Seeker**: Splash → Home (browse venues) → Venue (select tier) → Payment → Waiting (countdown) → Delivery (video + rating)

**Scout**: Splash → Dashboard (go online) → Accept request → Filming (record 30s) → Submitted (earnings)

## Current State

This is an MVP/prototype with fully functional UI flows but no backend integration. Camera, payments (Stripe), geolocation, authentication, and real-time notifications are all UI mockups. The app is ready for backend integration as the next phase.

## Pricing Model

- Standard: $15 Seeker → $8 Scout, 10-minute delivery, $7 platform margin
- Priority: $20 Seeker → $12 Scout, 7-minute delivery, $8 platform margin

## Brand

- Primary tagline: **"Know Before You Go."** (launch lead)
- Secondary tagline: **"Real Eyes. Right Now. Anywhere."** (long-term, in splash footer)
- Brand statement: *"We are eyes on the ground — everywhere."*

## Verification Stack (the moat — to be implemented in backend phase)

1. 30-50m GPS geofence around the venue
2. Only Scouts inside the geofence get pinged
3. Reference photo confirmation before filming
4. GPS-stamped clip on submission, auto-rejected if off-fence
5. AI signage detection on the clip itself
6. 20-minute Scout cooldown per venue
