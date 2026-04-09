# Pink Pineapple — Skill

## Brand

- **Name**: Pink Pineapple
- **Concept**: Premium Bali lifestyle guide — curated discovery and instant booking for clubs, restaurants, bars, beach clubs, and gyms
- **Positioning**: Monocle meets Time Out meets a local insider's WhatsApp group — beautifully designed and bookable
- **Audience**: Tourists and expats in Bali who want curated, high-quality venue discovery
- **Tone**: Warm, premium, editorial — tropical luxury, not cold tech
- **Areas**: Canggu, Uluwatu, Seminyak

## Design System

### New Design Language (for React Native rebuild)

```
Background:    #0A0A0A  (warm black — not cold navy)
Primary:       #F4C97A  (warm gold — tropical luxury)
Secondary:     #E8A87C  (warm coral — Bali sunset energy)
Text primary:  #FFFFFF
Text secondary: #888888
Cards:         #1A1A1A
```

Aesthetic: Four Seasons Bali meets Deus Ex Machina meets premium travel magazine.

### Legacy Flutter Design System (applied during reskin)

```
Background:    #0A0A0F  (near-black)
Cards:         #141420
Surface:       #1C1C2E
Elevated:      #252538
Border:        #2A2A3C

Rose-gold:     #D4A574  (primary accent)
Champagne:     #E8C99A  (gradient end)
Deep rose:     #C4956A  (hover/pressed)

Text primary:  #F5F5F0
Text secondary: #B8B8C8
Text muted:    #6B6B80

Heading font:  Cormorant Garamond (luxury editorial)
Body font:     Poppins (clean, modern)
```

Note: The assessment proposed a slightly different palette for the rebuild (gold/coral). The Flutter reskin used rose-gold. Final direction for the React Native rebuild should align on one palette.

## Tech Stack

### Mobile App — Legacy Flutter (to be rebuilt)
- **Location**: `projects/pink-pineapple/app/`
- **Stack**: Flutter/Dart + GetX state management
- **Status**: Full UI reskin complete (all auth, core, and secondary screens branded to dark luxury theme)
- **Decision**: Rebuild from scratch in React Native + Expo (same stack as LMC). The Flutter app was built by a Fiverr team with the wrong product direction (social media app instead of curated booking app). UI reskin was completed but the fundamental UX and feature set are wrong.
- **What's wrong**: Forced account creation before browsing, social features (newsfeed/followers/posts/likes) that aren't part of PP's direction, wrong user flow for a tourist discovery app

### Backend (keep + extend)
- **Location**: `projects/pink-pineapple/backend/`
- **Stack**: Node.js + TypeScript + Prisma ORM + MongoDB + Vercel
- **Has**: Users, Events, Bookings (TABLE + TICKET types), Tables (VIP with min spend), Chat (WebSocket), Notifications (FCM), Auth (OTP), Roles (ADMIN/CLUB/USER)
- **Needs**: Location/area filtering (Canggu/Uluwatu/Seminyak), venue categories (club/restaurant/bar/gym), gym bookings (day passes, weekly subs), payment integration (Stripe/PayPal), search/discovery endpoints
- **Verdict**: Schema is 70% of what's needed. Extend, don't replace.

### Dashboard (keep + redesign UI)
- **Location**: `projects/pink-pineapple/dashboard/`
- **Stack**: Next.js + TypeScript + Tailwind + shadcn/ui + Redux Toolkit (RTK Query)
- **Has**: Club/venue management, event management, bookings, messages, admin approvals, auth (login/register/OTP/password reset)
- **Status**: Full UI reskin complete (dark theme, rose-gold accents, Cormorant Garamond + Poppins typography)
- **Verdict**: Functionally right, visually reskinned. May need further redesign to match final brand direction.

### Content Assets
- **Location**: `projects/pink-pineapple/assets/`
- **Contains**: Character art (Pep, Tide, Shock), voice iterations (ElevenLabs tests), style explorations — these are for the Peptide Talk side project, not the main PP app

## Reskin Status (Flutter + Dashboard)

Both the Flutter app and Next.js dashboard have been fully reskinned by Pink (Frankie's partner agent):
- All auth screens (splash, login, signup, OTP, password reset, profile setup)
- All core screens (home/discover, explore, bookings, profile, event details, free user home, newsfeed)
- All secondary screens (blocked users, followers, favourites, saved/hidden posts)
- Dashboard (login, sidebar, navbar, settings, approvals, users, all inner pages)
- Pending: final logo asset (`splash_logo_v2.png` is placeholder)

## Current Phase

**Assessment complete, rebuild planned.** Flutter app fully reskinned but strategically rejected — wrong product direction. Backend is solid. Next step is React Native rebuild.

## Core User Journey (new app)

1. Land at Bali airport, download Pink Pineapple
2. Select area: Canggu / Uluwatu / Seminyak
3. See tonight's curated picks — what's happening, where, who's going
4. Browse venues with rich video content and editorial write-ups
5. Book instantly — table, VIP, ticket, day pass
6. Save favourites, follow venues for updates

**Key principle**: Browse-first, sign-up-at-booking. No forced account creation upfront.

## New App Screens (~15 total)

**Onboarding**: Splash, area selector, browse without signing in
**Discovery**: Home ("Tonight in Canggu"), venue profile, event detail, explore (by category), search
**Booking**: Ticket flow, VIP table flow, gym day pass/sub, confirmation, my bookings
**Account** (optional at first): Sign up/in, profile

## Goals

1. Extend backend schema for areas, venue categories, gyms, payment integration
2. Build new React Native + Expo app (~15 screens)
3. Connect to existing backend API
4. Test on device via Expo Go
5. Submit to App Store + Google Play

## Key Decisions

- Flutter app social features (newsfeed, followers, posts, likes) are NOT part of Pink Pineapple's direction
- The Fiverr-built Flutter app is kept in `app/` for reference but should not be used as a base for the rebuild
- React Native + Expo chosen to share stack with LMC (faster development, single codebase expertise)
