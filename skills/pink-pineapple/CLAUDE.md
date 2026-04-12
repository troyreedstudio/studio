# Pink Pineapple — Skill

## Brand

- **Name**: Pink Pineapple
- **Concept**: Premium Bali lifestyle guide — curated discovery and instant booking for clubs, restaurants, bars, beach clubs, and gyms
- **Positioning**: Curated, not crowdsourced. Every venue is hand-picked. Quality over quantity.
- **Audience**: Expats, digital nomads, and high-end tourists (25-45) in Bali
- **Tone**: Luxurious but approachable. Nightlife energy meets editorial polish. Bali-native, not tourist-generic.
- **Areas**: Canggu, Uluwatu, Seminyak (Ubud planned)
- **App Store ID**: `id6758339469`

## Logo (LOCKED)

- **"PINK"** — Bold geometric sans-serif, heavy weight (Black/900), metallic rose-gold gradient
- **"PINEAPPLE"** — Thin, wide letter-spacing (0.2em+), elegant sans-serif, Light/300, white on dark
- Primary on black background (dark-first brand)
- Logo file: `projects/pink-pineapple/assets/logo_primary_dark.jpg`

## Design System (LOCKED — from Frankie, confirmed by Sascha 2026-03-29)

Full specs in `projects/pink-pineapple/docs/DESIGN-SYSTEM.md` and `docs/BRAND-GUIDELINES.md`.

### Colours
```
Background:         #000000  (black)
Surface:            #1A1A1A  (cards, inputs, overlays)
Surface elevated:   #2A2A2A  (modals, elevated cards)

Rose-gold gradient: #8B4060 → #E8A0B0  (135°, CTAs, buttons, highlights, logo)
Rose-gold solid:    #C4707E  (mid-gradient, buttons, active states)

Text primary:       #FFFFFF
Text secondary:     #B0B0B0
Text muted:         #6B6B6B

Success:            #00C853  (open status)
Warning:            #FFB800  (closing soon, ratings)
Error:              #FF3B3B  (closed, errors)
```

### Typography
- **Venue names**: Bodoni Moda / Playfair Display (serif), Bold, 32-40px
- **"PINK" logo**: Geometric sans, Black/900
- **Labels/categories**: Sans-serif, Light/300, 12-14px, wide tracking (0.2em+), UPPERCASE, rose-gold
- **Section headers**: Montserrat/Inter, Semi-bold, 20-24px
- **Body**: Inter / DM Sans, Regular, 14-16px
- **Category format**: `BEACH CLUB · ULUWATU` (centered dot separator)

### Design Principles
1. Dark-first — dark backgrounds make venue photography pop
2. Photography-forward — hero images sell; text supports
3. Minimal chrome — thin borders, subtle shadows, let content breathe
4. Location-aware — always show which area the user is browsing
5. Bali-native — warm, golden, luxurious but relaxed

## Live Infrastructure

- **API**: `https://api.pinkpineapple.app/api/v1`
- **Dashboard**: `https://dashboard.pinkpineapple.app`
- **Database**: MongoDB (via Prisma)
- **Hosting**: DigitalOcean
- **File storage**: DigitalOcean Spaces + Cloudinary

## Tech Stack

### Backend (DONE — keep + extend)
- **Location**: `projects/pink-pineapple/backend/`
- **Stack**: Node.js + Express + Prisma ORM + MongoDB
- **Frankie completed**: Security fixes, code cleanup, venue API (full CRUD with areas + categories), 38 venues seeded, venue favorites, booking API, database indexes, upload validation
- **Still needs**: Payment integration (Stripe), proper Firebase project for push notifications

### Dashboard (DONE — fully rebranded)
- **Location**: `projects/pink-pineapple/dashboard/`
- **Stack**: Next.js + TypeScript + Tailwind + shadcn/ui + Redux Toolkit (RTK Query)
- **Frankie completed**: 100% rebranded to PP dark theme, all auth pages, all admin pages, all venue manager pages, venue management CRUD

### Mobile App — Flutter (LIVE on App Store + Google Play)
- **Location**: `projects/pink-pineapple/app/`
- **Stack**: Flutter/Dart + GetX
- **App Store ID**: `id6758339469`
- **Frankie completed**: Full UI reskin, 5 main tabs, venue detail + booking, venue favorites, all auth screens, area filtering
- **Status**: Live and deployed. The social features (newsfeed, followers, posts) remain in the build but are not part of the long-term product direction. Future iterations should move toward curated discovery and away from social.

### Content Assets
- **Location**: `projects/pink-pineapple/assets/`
- **Contains**: Logo, wireframe, Peptide Talk character art and voice files (side project assets stored here)

## Documentation (from Frankie)

All in `projects/pink-pineapple/docs/`:
- `BRAND-GUIDELINES.md` — full brand bible (LOCKED)
- `DESIGN-SYSTEM.md` — colour tokens, typography, components (LOCKED)
- `AUDIT-REPORT.md` — full code audit of all 3 codebases (critical security issues identified + fixed)
- `UI-UX-REDESIGN-ROADMAP.md` — complete redesign plan with screen specs
- `PROJECT-STATUS.md` — deployment handoff doc from Frankie to Pink
- `CHANGES-LOG.md`, `FIXES-APPLIED.md`, `VENUE-BUILD-LOG.md`, `MOBILE-BUILD-LOG*.md` — work logs

## Venue Database

38 venues seeded across 3 areas, 5 categories:
- **Canggu**: Miss Fish, Desa/Kitsune, Atlas, Jade, Saya Club, Muda By/Suka (one venue), etc.
- **Uluwatu**: Savaya, El Kabron, Sundays, etc.
- **Seminyak**: Da Maria (restaurant, also listed under Canggu for Hip Hop Wed), etc.
- **Categories**: Beach Clubs, Restaurants, Nightlife, Wellness, Events
- **Note**: ALL nightlife venues are in Canggu (confirmed by Sascha 2026-03-30)

## Current Phase

**LIVE — deployment and growth.** The app is live on the App Store and Google Play. Backend API is live at `api.pinkpineapple.app`. Dashboard is live at `dashboard.pinkpineapple.app`. 38 venues seeded. Focus is now on user acquisition, real venue photography, payment integration, and iterating on the live product.

## Core User Journey (target experience for the live Flutter app)

1. Land at Bali airport, download Pink Pineapple
2. Select area: Canggu / Uluwatu / Seminyak
3. See tonight's curated picks
4. Browse venues with rich photography and editorial write-ups
5. Book instantly — table, VIP, ticket, day pass
6. Save favourites, follow venues

**Key principle**: Browse-first, sign-up-at-booking. No forced account creation.

## Goals

1. Source real venue photography for all 38 venues (Sascha in Bali)
2. Rotate all credentials (see AUDIT-REPORT.md critical items)
3. Set up proper Firebase project for push notifications
4. Integrate Stripe for payments
5. User acquisition and growth in Bali market
6. Iterate on live product based on user feedback

## Key Decisions

- Brand and design system are LOCKED — do not change without Sascha's approval
- Flutter social features (newsfeed, followers, posts, likes) are NOT part of PP's long-term direction
- **Pink Pineapple stays on Flutter.** Do not propose a React Native rewrite. Iterate on the live Flutter codebase in `projects/pink-pineapple/app/` — apply the locked design system there.
- This project is SEPARATE from Agape 26 — do not conflate
