# Let Me Check (LMC)

On-demand nightlife venue video verification. Users pay $15-20 for a 60-second HD video of a venue filmed by a "Checker" (independent videographer), delivered within 7-15 minutes. Two user roles: Users (browse, request, pay, watch) and Checkers (accept, film, earn).

**Tagline**: "Know Before You Go"

**Status**: MVP/prototype complete -- fully functional UI flows with mock data. No backend yet.

## Tech Stack

- **Framework**: React Native 0.83.2 + Expo 54 + TypeScript 5.9
- **Routing**: Expo Router ~6.0.23 (file-based with grouped routes)
- **UI**: Native StyleSheet API (no CSS-in-JS library)
- **Icons**: Expo Vector Icons 15.1.1
- **State**: Local component state only (`useState`) -- no global state management
- **Data**: All mock data embedded in components -- no API layer
- **Code location**: `lmc-app/`
- **Entry point**: `lmc-app/app/_layout.tsx` (root Stack, dark theme)

## Build & Run

```bash
cd lmc-app
npm install
npm start         # Expo dev server (interactive menu)
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Browser
```

No build/deploy scripts configured -- Expo handles compilation.

## Architecture

### Navigation (Expo Router, file-based)
```
app/
  _layout.tsx         Root Stack (dark theme, no headers)
  index.tsx           Splash -- role selection (User vs Checker)
  (user)/
    _layout.tsx       User stack
    home.tsx          Venue browsing (5 mock venues, city filters)
    venue.tsx         Venue detail + tier selection (Standard/Priority)
    payment.tsx       Order summary + fee breakdown
    waiting.tsx       15-min countdown + progress steps
    delivery.tsx      Video player + 5-star rating + checker info
    history.tsx       Past checks + stats
    profile.tsx       Account settings + referrals
  (checker)/
    _layout.tsx       Checker stack
    dashboard.tsx     Online/offline toggle + incoming requests
    filming.tsx       Recording UI + 7-min countdown + 60-sec timer
    submitted.tsx     Success confirmation + earnings
    earnings.tsx      Weekly bar chart + payout history
```

### User Flow
Splash -> Home (browse venues) -> Venue (pick tier) -> Payment (review) -> Waiting (countdown) -> Delivery (watch + rate)

### Checker Flow
Splash -> Dashboard (go online, accept request) -> Filming (record 60s) -> Submitted (earn) -> Earnings (view payouts)

### Screen Sizes
Total: ~2,674 lines of TSX across 11 screens + 4 layouts. No extracted utilities, hooks, or service layer.

## Design System

```
Background:         #000000   black
Card backgrounds:   #111111, #0d0d0d, #0d1a0d (green-tinted)
Primary accent:     #22c55e   green (CTAs, success, active states)
Secondary accent:   #f59e0b   amber (priority badges, premium tier)
Text primary:       #ffffff
Text secondary:     #888888
Text tertiary:      #555555
Borders/dividers:   #333333, #1e1e1e

Buttons:  rounded 12-16px, high contrast, activeOpacity 0.7-0.85
Cards:    dark rounded containers, 1-2px borders
Logo:     88px fontWeight 900, letterSpacing 3
```

No theme file -- colours are inline in each screen's `StyleSheet.create()`.

## Pricing Model

| Tier | User Price | Platform Fee | Total | Checker Payout | Platform Revenue |
|------|-----------|-------------|-------|----------------|-----------------|
| Standard | $15.00 | $1.50 | $16.50 | $8.00 | $7.00 |
| Priority | $20.00 | $2.00 | $22.00 | $13.00 | $7.00 |

## What's Built vs What's Missing

### Built (UI complete)
- All 11 user-facing screens with mock data
- Full navigation between screens
- Timer/countdown logic (waiting + filming)
- Interactive elements (toggles, rating, buttons)
- Dark theme consistently applied
- TypeScript strict mode throughout
- Safe area handling

### Not Built
- **Backend**: No API, no database, no server
- **Auth**: No login/signup (role selection only)
- **Payments**: Stripe not integrated (checkout is visual only)
- **Camera**: Recording UI exists but no camera API
- **Video upload/storage**: No cloud storage
- **Geolocation**: GPS badge shown but no real location
- **Notifications**: No push or real-time
- **State management**: No Redux/Zustand/Jotai
- **Error handling**: No try/catch, no error boundaries
- **Form validation**: No zod/yup
- **Tests**: None configured
- **Linting**: No .eslintrc or .prettierrc

## Assets

```
lmc-app/assets/         App icons (icon.png, splash-icon.png, favicon.png, android adaptive)

Root level:
  lmc-trailer.mp4       Product video (2.2 MB)
  lmc-trailer-vo.mp3    Voiceover (189 KB)
  lmc-logo-*.png        8 logo variations (v3, scalable, futuristic, gold, youth)
  lmc-app-*.png         17 app screenshot mockups
  lmc-checker-*.png     4 checker flow screenshots
  lmc-all-screens.png   Full mockup composite (4.3 MB)
```

## Documentation

- `lmc-app/CLAUDE.md` -- internal project doc (exists but this file supersedes)
- `docs/BUSINESS-PLAN.md` -- comprehensive business strategy
- `docs/LMC-Pitch-Deck*.pdf` -- 3 pitch deck versions
- `docs/LMC-Business-Plan.pdf` -- formatted business plan
- `MVP-PLAN.md` -- original Telegram bot MVP strategy (pre-app)

## Next Steps

1. Choose and integrate backend (Firebase, Supabase, or custom)
2. Add global state management (Zustand or Redux Toolkit)
3. Extract design tokens into a theme file
4. Build API service layer (hooks + error handling)
5. Integrate Stripe for payments
6. Camera API integration for Checker recording
7. Video upload pipeline (S3/Cloudinary/Firebase Storage)
8. Geolocation for Checker dispatch
9. Push notifications (Expo Notifications + FCM)
10. Beta launch in one city (originally planned: Miami)
