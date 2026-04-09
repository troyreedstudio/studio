# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Let Me Check (LMC)** is a React Native + Expo mobile app for on-demand video verification of nightlife venues. Users pay $15-20 for a 60-second video clip of a venue filmed by a "Checker" (independent videographer), delivered within 7-15 minutes.

Two distinct user roles with separate navigation stacks:
- **Users**: Browse venues, request checks, pay, watch delivered clips
- **Checkers**: Accept nearby requests, film clips, earn money ($8-13 per check)

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
- **Routing**: Expo Router (file-based) with grouped routes `(user)/` and `(checker)/`
- **State**: Local component state only (no Redux/Zustand). Inter-screen data passes via route params (`useLocalSearchParams`)
- **Styling**: `StyleSheet.create()` with a dark theme (`#000` background, `#22c55e` green accent, `#f59e0b` amber accent, `#fff`/`#888`/`#555` text hierarchy, `#1e1e1e`-`#333` borders)
- **Data**: All mock data is embedded directly in screen components (no API layer yet)

### Routing Structure

```
app/
  _layout.tsx          # Root Stack navigator (black theme)
  index.tsx            # Splash/role selection screen
  (user)/
    _layout.tsx        # User stack layout
    home.tsx           # Venue browsing, search, city filters
    venue.tsx          # Venue detail, tier selection
    payment.tsx        # Order summary, fee breakdown
    waiting.tsx        # Countdown + delivery progress
    delivery.tsx       # Video player, rating, checker info
    history.tsx        # Past checks, stats
    profile.tsx        # Account settings, referrals
  (checker)/
    _layout.tsx        # Checker stack layout
    dashboard.tsx      # Online toggle, incoming requests, earnings
    filming.tsx        # Recording UI, countdown, GPS badge
    submitted.tsx      # Success confirmation, clip stats
    earnings.tsx       # Weekly chart, payouts, withdraw
```

### User Flow

**User**: Splash -> Home (browse venues) -> Venue (select tier) -> Payment -> Waiting (countdown) -> Delivery (video + rating)

**Checker**: Splash -> Dashboard (go online) -> Accept request -> Filming (record) -> Submitted (earnings)

## Current State

This is an MVP/prototype with fully functional UI flows but no backend integration. Camera, payments (Stripe), geolocation, authentication, and real-time notifications are all UI mockups. The app is ready for backend integration as the next phase.

## Pricing Model

- Standard tier: $15 + $1.50 platform fee = $16.50
- Priority tier: $20 + $2.00 platform fee = $22.00
- Checker payout: $8-13 per check
