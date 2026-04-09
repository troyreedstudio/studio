# Pink Pineapple — Skill

## Brand

- **Name**: Pink Pineapple
- **Concept**: Premium Bali lifestyle guide — curated discovery and instant booking for clubs, restaurants, bars, beach clubs, and gyms
- **Positioning**: Monocle meets Time Out meets a local insider's WhatsApp group — beautifully designed and bookable
- **Audience**: Tourists and expats in Bali who want curated, high-quality venue discovery
- **Tone**: Warm, premium, editorial — tropical luxury, not cold tech
- **Areas**: Canggu, Uluwatu, Seminyak

## Design Language

- Background: `#0A0A0A` (warm black)
- Primary accent: `#F4C97A` (warm gold — tropical luxury)
- Secondary accent: `#E8A87C` (warm coral — Bali sunset energy)
- Text: `#FFFFFF` primary, `#888888` secondary
- Cards: `#1A1A1A`
- Aesthetic: Four Seasons Bali meets Deus Ex Machina meets premium travel magazine

## Tech Stack

- **Mobile app (legacy)**: Flutter/Dart + GetX — `projects/pink-pineapple/app/` — 129 Dart files, to be REBUILT in React Native + Expo
- **Backend (keep + extend)**: Node.js + TypeScript + Prisma + MongoDB + Vercel — `projects/pink-pineapple/backend/`
  - Has: Users, Events, Bookings, Tables, Tickets, Chat (WebSocket), Notifications (FCM), Auth (OTP), Roles (ADMIN/CLUB/USER)
  - Needs: Location/area filtering, venue categories, gym bookings, payment integration (Stripe), search/discovery
- **Dashboard (keep + redesign UI)**: Next.js + TypeScript + Tailwind + shadcn/ui + Redux Toolkit — `projects/pink-pineapple/dashboard/`
  - Has: Club/venue management, event management, bookings, messages, admin approvals
- **Content assets**: Character art, voice iterations, style explorations — `projects/pink-pineapple/assets/`

## Current Phase

**Assessment complete, rebuild planned.** Backend is solid (70% of schema needed). Flutter app assessed and rejected — wrong product direction (social media app instead of curated booking app), wrong design language, wrong user flow. Rebuilding mobile app from scratch in React Native + Expo (same stack as LMC).

## Goals

1. Extend backend schema for areas, venue categories, gyms, payment integration
2. Build new React Native + Expo app (~15 screens — discovery, booking, account)
3. Redesign dashboard UI to match new brand language
4. Connect new app to existing backend API
5. Test on device via Expo Go
6. Submit to App Store + Google Play

## Key Decisions

- Flutter app social features (newsfeed, followers, posts, likes) are NOT part of Pink Pineapple's direction — do not rebuild them
- Browse-first, sign-up-at-booking user flow — no forced account creation upfront
- Core user journey: Area select -> Tonight's picks -> Venue profile -> Book instantly
