# Pink Pineapple — Code Assessment Report
*Assessed by Pink 🌸 — March 28, 2026*

---

## Summary Verdict

**Backend: Keep it. Frontend: Rebuild completely.**

The Fiverr team built a technically functional app but the design, user experience, and product direction are wrong for what Pink Pineapple needs to be. The backend is solid enough to reuse. The Flutter app needs a complete redesign from the ground up.

---

## Backend Assessment ✅ KEEP

**Tech stack:** Node.js + TypeScript + Prisma ORM + MongoDB + Vercel

**What's good:**
- Well-structured database schema — Users, Events, Bookings, Tables, Tickets, Chat, Notifications all properly modelled
- Booking system supports both TABLE and TICKET types — exactly what you need
- Event management with start/end dates, ticket limits, additional guests
- VIP table system with minimum spend amounts, charges, and guest limits
- Real-time chat via WebSockets — already built
- Push notifications (FCM) wired up
- Auth with OTP verification
- User roles: ADMIN, CLUB, USER — right structure for your venue partnership model
- Deployed on Vercel — scalable, no server management

**What's missing from backend:**
- Location/area filtering (Canggu, Uluwatu, Seminyak) — needs adding
- Venue categories (club, restaurant, bar, gym) — needs adding
- Gym-specific booking (day passes, weekly subscriptions) — needs adding
- Payment integration (Stripe/PayPal) — not built yet
- Search/discovery endpoints — basic only

**Verdict:** The database schema is 70% of what you need. We extend it, not replace it.

---

## Flutter App Assessment ❌ REBUILD

**What they built:**
- 129 Dart files, GetX state management
- Features: home, events, bookings, chat, newsfeed (social feed), favorites, explore, profile

**The problems:**

### 1. Wrong product category
They built a **social media app** (newsfeed, followers, posts, likes, comments) not a **curated discovery and booking app**. Pink Pineapple is not Instagram for Bali clubs. The entire newsfeed/social layer is irrelevant and clutters the app.

### 2. Wrong design language
- Primary colour: `#A57865` (a muddy brown/tan) — not premium, not Bali luxury
- Gradient: purple to magenta (`#7B4BF5` to `#BD5FF3`) — looks like a generic 2019 fintech app
- Dark navy background (`#000710`) — almost right but the wrong shade
- No sense of Bali aesthetic — tropical luxury, warmth, natural materials

### 3. Wrong user flow
App requires full account creation before seeing anything. For a tourist app, people need to browse first, sign up only when booking. Discovery before friction.

### 4. Missing the core Pink Pineapple features
- No location/area selector (Canggu, Uluwatu, Seminyak)
- No curated "tonight" section with editorial feel
- No venue profiles with rich video/photo content
- No gym/wellness section at all
- No "in the know" insider curation — feels like a directory, not a guide

### 5. Technically fine but aesthetically poor
Code quality is acceptable — GetX is a valid state management choice, structure is logical. But the UI components are generic, spacing is off, typography is basic.

---

## Dashboard Assessment ⚠️ KEEP WITH REDESIGN

**Tech stack:** Next.js + TypeScript + Tailwind

**What's there:** 
- Club/venue management portal — venues can manage their events, bookings, messages
- Admin section

**Verdict:** Functionally right, visually generic. Redesign the UI, keep the functionality.

---

## Rebuild Plan

### What Pink Pineapple should actually be:

**The Concept:** A premium Bali lifestyle guide. Think Monocle meets Time Out meets a local insider's WhatsApp group — but beautifully designed and bookable.

**Core user journey:**
1. Land at Bali airport → download Pink Pineapple
2. Select your area: Canggu / Uluwatu / Seminyak
3. See tonight's curated picks — what's happening, where, who's going
4. Browse venues with rich video content and editorial write-ups
5. Book instantly — table, VIP, ticket, day pass
6. Save favourites, follow venues for updates

---

### New Tech Stack for Rebuild

**Keep:** Node.js backend (extend the schema)
**Replace Flutter with:** React Native + Expo (same stack as LMC)

**Why switch from Flutter to React Native:**
- Same codebase used for LMC — I can build faster
- Better ecosystem for content-heavy apps
- Easier to maintain long term
- Expo handles deployment complexity

---

### New Design Language

**Colour palette:**
- Background: `#0A0A0A` (warm black — not cold navy)
- Primary accent: `#F4C97A` (warm gold — tropical luxury)
- Secondary accent: `#E8A87C` (warm coral — Bali sunset energy)
- Text: `#FFFFFF` primary, `#888888` secondary
- Cards: `#1A1A1A`

**Aesthetic:** Think Four Seasons Bali meets Deus Ex Machina meets a premium travel magazine. Warm, textured, tropical luxury. Not cold tech.

---

### Screens to Build (New App)

**Onboarding:**
1. Splash — Pink Pineapple logo, pineapple icon
2. Area selector — Canggu / Uluwatu / Seminyak (beautiful full-screen area cards)
3. Browse without signing in (sign up only at booking)

**Discovery:**
4. Home — "Tonight in Canggu", curated picks, trending venues, upcoming events
5. Venue profile — rich photos/video, about, upcoming events, book now
6. Event detail — full event info, ticket options, table options
7. Explore — browse all venues by category (Clubs, Restaurants, Bars, Beach Clubs, Gyms)
8. Search — find anything fast

**Booking:**
9. Ticket booking flow — select ticket type, guest count, checkout
10. VIP table booking — select table, see minimum spend, add guests, checkout
11. Gym day pass / subscription booking
12. Booking confirmation
13. My bookings — upcoming and past

**Account (optional at first):**
14. Sign up / Sign in
15. Profile — bookings history, saved venues, preferences

**Total: ~15 screens** — clean, focused, no social media clutter.

---

## Next Steps

1. Troy shares Figma designs (or we design from scratch — our designs may be better)
2. I extend the backend schema for areas, venue categories, gyms
3. I build the new React Native app from scratch
4. Connect to existing backend API
5. Test on device via Expo Go
6. Submit to App Store + Google Play

**Timeline estimate:** 2-3 weeks for full working app

---

*Files assessed:*
- `pineapple-main.zip` — 129 Flutter Dart files
- `troyreed1725-backend-main.zip` — 105 TypeScript backend files  
- `troyreed1725-dashboard-main.zip` — 68 Next.js dashboard files
- `TroyReed Credentials.pdf` — credentials document
