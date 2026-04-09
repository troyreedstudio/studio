# 🍍 Pink Pineapple — UI/UX Redesign Roadmap

**Date:** 2026-03-29
**Created by:** Frankie

---

## The Problem

The current app is a generic "Eventify" template with:
- Dusty rose/brown colour scheme (#A57865) — no Bali energy
- Generic stock imagery (blurred bedrooms, placeholder pineapples)
- No location awareness (no Canggu, Uluwatu, Seminyak)
- App Store listing still mentions "Eventify" by name
- Social feed features (posts, likes, comments) that distract from the core value: **discovering and booking Bali experiences**
- No brand personality — looks like 1,000 other event apps

## The Vision

**Pink Pineapple is the go-to lifestyle app for Bali.** Not an event app with social bolted on — a **curated lifestyle guide** that makes you feel like you have a well-connected local friend who knows every spot.

**Target audience:** Expats, digital nomads, and high-end tourists (25-45) in Bali who want to discover the best beach clubs, restaurants, nightlife, and wellness spots without the guesswork.

**Competitive edge:** Curated, not crowdsourced. Every venue is hand-picked. Quality over quantity.

---

## Brand Identity

### Colour Palette (LOCKED — from Frankie's original brand work)

| Role | Colour | Hex | Usage |
|------|--------|-----|-------|
| **Primary** | Rose-Gold Gradient | `#8B4060` → `#E8A0B0` | Logo, CTAs, highlights, brand marks |
| **Primary Solid** | Metallic Rose | `#C4707E` | Buttons, active states (mid-gradient) |
| **Dark** | Black | `#000000` | Primary backgrounds, cards |
| **Surface** | Dark Grey | `#1A1A1A` | Card backgrounds, overlays |
| **Light Text** | White | `#FFFFFF` | Primary text on dark backgrounds |
| **Light** | Off White | `#FAF7F2` | Light mode backgrounds |
| **Muted** | Soft Grey | `#9E9E9E` | Secondary text, borders, labels |
| **Success** | Tropical Green | `#00C853` | Confirmations, available |
| **Accent** | Gold | `#D4A853` | Ratings, premium badges |

### Logo
- **"PINK"** — Bold geometric sans-serif with metallic rose-gold gradient
- **"PINEAPPLE"** — Thin, wide letter-spacing, elegant sans-serif in white
- Primary on black background (dark-first brand)
- Logo file saved: `pink-pineapple/logo_primary_dark.jpg`

### Typography
- **"PINK" headline font:** Bold geometric sans-serif (as per logo)
- **"PINEAPPLE" subhead:** Thin, wide-tracked elegant sans-serif
- **Body:** Inter or DM Sans (sans-serif) — clean, modern readability
- **Accent:** Light-weight wide-tracked type for labels and categories

### Design Principles
1. **Dark-first** — dark backgrounds make venue photography pop (golden hour shots, neon nightlife)
2. **Photography-forward** — hero images do the selling, not text
3. **Minimal chrome** — thin borders, subtle shadows, let content breathe
4. **Location-aware** — always know which area you're browsing
5. **Bali-native** — palm fronds, ocean gradients, golden hour tones woven into the UI DNA

---

## Information Architecture (Redesigned)

### Current App Structure
```
Home (social feed) → Explore (events list) → Bookings → Chat → Profile
```

### New App Structure
```
Discover (curated home) → Explore (map + browse) → Tonight → Bookings → Profile
```

### Screen-by-Screen Breakdown

#### 1. 🏠 DISCOVER (Home Tab)
**Purpose:** Curated editorial homepage — makes you want to go OUT

**Layout:**
- **Hero carousel** (full-width, auto-scroll) — Featured venue/event of the week with stunning photography
- **"Tonight" strip** — Horizontal scroll of what's happening RIGHT NOW (auto-filtered by current time + timezone)
- **Area quick-select** — Pill buttons: Canggu · Uluwatu · Seminyak · Ubud (filters everything below)
- **Category rows** (horizontal scroll per category):
  - 🏖️ Beach Clubs — Savaya, Finns, Sundays, El Kabron...
  - 🍽️ Restaurants — Kong, Mason, Da Maria, Sardine...
  - 🌙 Nightlife — Jade, Miss Fish, Atlas...
  - 🧘 Wellness — Nirvana, Body Factory, Obsidian...
- **"Trending This Week"** — Editorial picks, 2-3 venues with short blurbs
- **Community highlights** — User photos from verified check-ins (replaces generic social feed)

#### 2. 🗺️ EXPLORE (Browse Tab)
**Purpose:** Find exactly what you want

**Layout:**
- **Map view** (toggle) — venues plotted on map with category-coloured pins
- **List view** (default) — filterable grid of venue cards
- **Filters:** Area · Category · Price range · Open now · Rating
- **Search bar** — full-text search across venues, events, experiences
- **Venue cards:** Hero image, name, category pill, area tag, rating, "Book" CTA

#### 3. 🌙 TONIGHT (Tab or Discover section)
**Purpose:** Instant answer to "what should I do tonight?"

**Layout:**
- Time-aware: shows what's happening from NOW until 4am
- Grouped by category (Beach Club sunset sessions → Dinner → Late night)
- Each card shows: venue photo, event name, time, entry/booking info
- One-tap booking or "Add to my night" planner

#### 4. 🎫 BOOKINGS (Tab)
**Purpose:** Your reservation hub

**Layout:**
- **Upcoming** — active bookings with countdown timers
- **Past** — history with option to rebook or leave a review
- **Booking card:** Venue photo, date/time, party size, confirmation code, QR code for check-in
- Deep link to venue detail

#### 5. 👤 PROFILE (Tab)
**Purpose:** Your Bali lifestyle profile

**Layout:**
- Profile photo, name, member since
- **My saved venues** — bookmarked spots
- **My photos** — check-in photos
- **Settings** — notifications, account, preferences
- **Area preference** — default area for recommendations

#### 6. 📍 VENUE DETAIL (Screen)
**Purpose:** Everything about a venue — the "sell" page

**Layout:**
- **Full-bleed hero image** (parallax scroll)
- **Quick info bar:** Category · Area · Price range · Rating
- **Photo gallery** — swipeable, full-screen capable
- **About** — 2-3 sentence editorial description (NOT copy-paste from Google)
- **What's On** — upcoming events at this venue
- **Menu/Pricing** — if applicable
- **Book a table / Buy tickets** — primary CTA, sticky bottom bar
- **Location** — embedded map with directions
- **Similar venues** — "You might also like"

#### 7. 📅 EVENT DETAIL (Screen)
**Purpose:** Event-specific booking

**Layout:**
- Hero image with date/time overlay
- Event description
- Ticket types / table options
- Guest count selector
- Price breakdown
- "Book Now" CTA
- Share button

---

## Dashboard Redesign

### Current: Generic admin panel
### New: Venue management hub

**Admin Dashboard:**
- 📊 **Overview** — total users, bookings this week, revenue, trending venues
- 📍 **Venues** — CRUD for all venues (name, area, category, photos, description, hours, pricing)
- 📅 **Events** — create/manage events linked to venues
- 🎫 **Bookings** — view/manage all reservations
- 👥 **Users** — user management, reports
- 💬 **Messages** — support/venue inquiries
- ⚙️ **Settings** — platform config

**Club/Venue Owner Dashboard:**
- Their venue profile management
- Their events management
- Their bookings & capacity
- Revenue reports
- Customer messages

---

## Migration Strategy

### What We Keep
- ✅ Backend API structure (with our security fixes applied)
- ✅ Auth flow (login/register/OTP)
- ✅ Booking system core
- ✅ WebSocket chat
- ✅ User profiles

### What We Rebuild
- 🔄 Entire mobile UI (same Flutter codebase, new screens)
- 🔄 Dashboard UI (same Next.js, new components)
- 🔄 Navigation structure (5 tabs → new 4-tab layout)
- 🔄 Colour scheme and typography
- 🔄 All imagery and icons

### What We Add
- ➕ Venue model in database (separate from Events)
- ➕ Area/location system
- ➕ Category taxonomy
- ➕ "Tonight" time-aware filtering
- ➕ Map integration
- ➕ Venue detail pages
- ➕ Editorial content system
- ➕ QR code for check-in
- ➕ Photo check-in system

### What We Remove/Deprioritise
- ❌ Generic social feed (newsfeed/posts/likes/comments) → replace with venue-linked check-in photos
- ❌ Follow/follower social graph → replace with "saved venues"
- ❌ Hidden posts feature
- ❌ Report feature (keep backend, remove from v1 UI)

---

## Technical Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create new Prisma models: Venue, Area, Category
- [ ] Seed database with our 36 curated venues
- [ ] Build venue CRUD API endpoints
- [ ] Set up new colour tokens in Flutter + Tailwind
- [ ] Replace all brand assets (logo, icons, splash screen)

### Phase 2: Mobile App Screens (Week 3-5)
- [ ] Build Discover (home) screen
- [ ] Build Venue Detail screen
- [ ] Build Explore screen with filters
- [ ] Build Tonight screen
- [ ] Redesign Bookings screen
- [ ] Redesign Profile screen
- [ ] New navigation bar
- [ ] Collect real venue photography (Sascha in Bali!)

### Phase 3: Dashboard Redesign (Week 4-5)
- [ ] Admin overview dashboard with metrics
- [ ] Venue management CRUD pages
- [ ] Event management (linked to venues)
- [ ] Booking management view
- [ ] New sidebar navigation
- [ ] Pink Pineapple branding throughout

### Phase 4: Polish & Launch Prep (Week 6)
- [ ] App Store listing rewrite
- [ ] App Store screenshots (new UI)
- [ ] Performance testing
- [ ] User testing with 5-10 Bali locals
- [ ] Soft launch

---

## App Store Listing (Rewrite)

### Current Title: "Pink Pineapple App"
### New Title: "Pink Pineapple — Bali Lifestyle Guide"

### New Description:
> **Your curated guide to the best of Bali.**
>
> Pink Pineapple is the insider's guide to Bali's best beach clubs, restaurants, nightlife, and wellness spots. Every venue is hand-picked by locals who live the lifestyle.
>
> **Discover**
> Curated recommendations across Canggu, Uluwatu, Seminyak, and Ubud. From sunset sessions at Savaya to late nights at Jade — find your vibe.
>
> **Book Instantly**
> Reserve tables, buy tickets, and secure your spot in seconds. No calls, no DMs, no hassle.
>
> **Tonight**
> Not sure what to do tonight? We've got you. Real-time recommendations based on what's happening right now.
>
> **Stay in the Loop**
> New venues, special events, exclusive experiences — be the first to know.
>
> Download Pink Pineapple and experience Bali like a local. 🍍

### Keywords:
bali, beach clubs, restaurants, nightlife, canggu, uluwatu, seminyak, events, booking, lifestyle, wellness, expat

---

## Venue Photography Standards

Based on our previous benchmark (Savaya hero shot):

1. **Hero images must be:** Real photography (not AI), golden hour or dramatic lighting, wide/cinematic framing, high resolution (min 1920px wide)
2. **Acceptable sources:** Venue's own press photos, professional photographers, Sascha's personal photos
3. **NOT acceptable:** Google Maps screenshots, phone selfies, AI-generated, stock photos
4. **Fallback:** If no quality hero exists, use a moody placeholder with venue name overlay until real photography is sourced

---

## Success Metrics

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| App Store rating | No ratings | 4.5+ stars |
| Monthly active users | ~0 | 500+ |
| Bookings per month | 0 | 50+ |
| Venues listed | 0 (events only) | 50+ |
| Areas covered | 0 | 4 (Canggu, Uluwatu, Seminyak, Ubud) |
| Avg session duration | Unknown | 3+ minutes |

---

## Open Questions for Sascha & Troy

1. **Monetisation model:** Commission per booking? Venue subscription? Freemium user tiers?
2. **Venue partnerships:** Do we need formal agreements before listing? Or list first, formalise later?
3. **Photography:** Can you start capturing venue photos while in Bali? I can create a shot list.
4. **Map provider:** Google Maps (paid) or Mapbox (free tier)?
5. **Launch area:** Start with Canggu only, or all 3 areas from day one?
6. **Timeline:** Is the 6-week roadmap realistic with the Fiverr team's capacity?
