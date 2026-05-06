# Let Me Check (LMC)

**Agent name**: Guy — the Claude Code agent for this project. (Other studio projects have their own named agents; use Guy only in `let-me-check/`.)

Universal visual verification on demand. A **Seeker** pays to have a **Scout** (a real person on the ground) film a 30-second clip of any location — DMV queues, airports, restaurants, real estate, gyms, retail, events, hotels, beach clubs, anywhere. Delivered in 7–10 minutes.

**Tagline (primary)**: "Know Before You Go."
**Tagline (secondary)**: "Real Eyes. Right Now. Anywhere."

**Phase 1 launch wedge**: Miami nightlife (50 Scouts, 20 venues, 500 paid requests in 90 days). The product is universal; the launch is tight.

**Status**: MVP/prototype complete — fully functional UI flows with mock data. No backend yet.

## Tech Stack

- **Framework**: React Native 0.83.2 + Expo 54 + TypeScript 5.9
- **Routing**: Expo Router ~6.0.23 (file-based with grouped routes `(seeker)/` and `(scout)/`)
- **UI**: Native StyleSheet API
- **Icons**: Expo Vector Icons 15.1.1
- **State**: Local component state only (`useState`) — no global state management yet
- **Data**: All mock data embedded in components — no API layer yet
- **Code location**: `lmc-app/`
- **Entry point**: `lmc-app/app/_layout.tsx` (root Stack, dark theme)

See `docs/STACK.md` for the full backend + video + geo + payments stack we're building toward.

## Build & Run

```bash
cd lmc-app
npm install
npm start         # Expo dev server (interactive menu)
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Browser
```

## Architecture

### Navigation (Expo Router, file-based)
```
app/
  _layout.tsx         Root Stack (dark theme, no headers)
  index.tsx           Splash — role selection (Seeker vs Scout)
  (seeker)/
    _layout.tsx       Seeker stack
    home.tsx          Venue browsing (5 mock venues, city filters)
    venue.tsx         Venue detail + tier selection (Standard/Priority)
    payment.tsx       Order summary + fee breakdown
    waiting.tsx       7-10 min countdown + progress steps
    delivery.tsx      Video player + 5-star rating + Scout info
    history.tsx       Past checks + stats
    profile.tsx       Account settings + referrals + switch to Scout mode
  (scout)/
    _layout.tsx       Scout stack
    dashboard.tsx     Online/offline toggle + incoming requests
    filming.tsx       Recording UI + 7-min countdown + 30-sec timer
    submitted.tsx     Success confirmation + earnings
    earnings.tsx      Weekly bar chart + payout history
```

### Seeker Flow
Splash → Home (browse venues) → Venue (pick tier) → Payment (review) → Waiting (countdown) → Delivery (watch + rate)

### Scout Flow
Splash → Dashboard (go online, accept request) → Filming (record 60s) → Submitted (earn) → Earnings (view payouts)

## Design System (current MVP)

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

No theme file yet — colours are inline in each screen's `StyleSheet.create()`. Extracting tokens is a backlog item.

## Pricing Model

| Tier | Seeker pays | Platform fee | Total | Scout earns | Platform revenue |
|------|------------|--------------|-------|-------------|------------------|
| Standard | $15.00 | $1.50 | $16.50 | $8.00 | $7.00 |
| Priority | $20.00 | $2.00 | $22.00 | $12.00 | $8.00 |

## Verification Stack (the moat)

1. 30–50m GPS geofence around the venue
2. Only Scouts inside the geofence get pinged
3. Reference photo confirmation before filming
4. GPS-stamped clip on submission, auto-rejected if off-fence
5. AI signage detection on the clip itself
6. 20-minute Scout cooldown per venue

## What's Built vs What's Missing

### Built (UI complete)
- All 11 user-facing screens with mock data
- Full navigation between Seeker and Scout stacks
- Timer/countdown logic (waiting + filming)
- Interactive elements (toggles, rating, buttons)
- Dark theme consistently applied
- TypeScript strict mode throughout
- Safe area handling

### Not Built (the build list)
- **Backend**: No API, no database, no server (Supabase is the chosen stack — see `docs/STACK.md`)
- **Auth**: No login/signup (Sign in with Apple, Google, email + SMS OTP planned)
- **Payments**: No Stripe yet (Stripe Connect Express for Scout payouts)
- **Camera**: Recording UI exists but no real camera (vision-camera planned)
- **Video pipeline**: No upload/transcode/CDN (Mux planned)
- **Geolocation**: GPS badge is a mockup (PostGIS + H3 + Mapbox planned)
- **Notifications**: No push (Expo Push planned)
- **State management**: No Redux/Zustand/Jotai (will add when backend lands)
- **Verification stack**: All 6 layers unbuilt — moves first when backend starts

## Assets

```
lmc-app/assets/         App icons (icon.png, splash-icon.png, favicon.png, android adaptive)

Root level:
  lmc-trailer.mp4       Product video (2.2 MB)
  lmc-trailer-vo.mp3    Voiceover (189 KB)

old-png-images-do-not use-just for ref/   — Pink's logo + UI mockup explorations
docs/                                      — Business plan, pitch decks, STACK.md
docs/archive/                              — Outdated / superseded plans (Telegram-bot MVP)
```

## Documentation

- `lmc-app/CLAUDE.md` — internal app-level dev guide
- `docs/BUSINESS-PLAN.md` — Pink's canonical business plan (brand, pricing, verification, launch sequence)
- `docs/STACK.md` — locked tech stack (backend, geo, video, payments, auth, ML, ops)
- `docs/LMC-Pitch-Deck*.pdf` — three pitch deck versions
- `docs/LMC-Business-Plan.pdf` — formatted business plan PDF
- `docs/archive/MVP-PLAN-telegram-bot-OUTDATED.md` — original Telegram bot MVP, **superseded** by the iOS + Android native app direction. Reference only.

## Build Order (Wave 1)

1. Backend + auth shell (Supabase + Sign in with Apple/Google)
2. Dispatch + geolocation core (PostGIS + H3 + Mapbox)
3. Video + payments (vision-camera + Mux + Stripe Connect)
4. Full verification stack (geofence + photo confirm + GPS stamp + signage AI + cooldown + rating)
5. Beta in Miami (50 Scouts, 20 venues, 500 paid requests in 90 days)

Later waves: polish, Live feed, AI Scout coach, Library Mode, B2B API, second city.

---

## RuFlo V3 Integration

This project is initialised for RuFlo V3 (`.claude/`, `.claude-flow/`, `.mcp.json`). The full RuFlo swarm/memory/MCP configuration lives in `~/CLAUDE.md` (global) and `~/studio/CLAUDE.md` (studio-wide) — no need to duplicate it here.

- **Topology**: hierarchical-mesh · **Max Agents**: 15 · **Memory**: hybrid · **HNSW + Neural**: enabled
- **CLI**: `ruflo` (not `claude-flow`) — e.g. `ruflo swarm init`, `ruflo memory search`, `ruflo daemon start`
- **File rules**: never save working files/tests/docs to root — use `/src`, `/tests`, `/docs`, `/scripts`
- **Security**: never commit `.env` or credentials; validate input at boundaries
