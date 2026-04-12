# Pink Pineapple

Premium Bali lifestyle guide and booking app. Curated discovery of clubs, restaurants, bars, beach clubs, and gyms with instant booking. Think Monocle meets Time Out meets a local insider's WhatsApp group.

**Status**: LIVE on App Store + Google Play. Backend, dashboard, and Flutter app all deployed.

## Tech Stack

### Flutter App (`app/`)
- **Framework**: Flutter/Dart (SDK ^3.9.0)
- **State management**: GetX (reactive variables, DI, routing)
- **Version**: 1.2.0+4
- **App Store ID**: `id6758339469`
- **Key deps**: flutter_screenutil, google_fonts, cached_network_image, http, web_socket_channel, shared_preferences, carousel_slider, upgrader
- **Design size**: 360x640 (ScreenUtilInit)
- **Entry point**: `lib/main.dart` -> SplashScreen via GetMaterialApp

### Backend (`backend/`)
- **Framework**: Node.js + Express 4 + TypeScript
- **ORM**: Prisma 6.15 -> MongoDB
- **Auth**: JWT + bcrypt + OTP (nodemailer)
- **Payments**: Stripe v16.8 (installed, NOT integrated)
- **File storage**: Cloudinary, AWS S3, Google Cloud Storage
- **Real-time**: Socket.IO (WebSocket chat)
- **Validation**: zod (installed, inconsistently applied)

### Dashboard (`dashboard/`)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **State**: Redux Toolkit + RTK Query
- **UI**: Tailwind 3.4 + shadcn/ui (Radix primitives)
- **Forms**: React Hook Form + Zod

## Live Infrastructure

| Service | URL |
|---------|-----|
| API | `https://api.pinkpineapple.app/api/v1` |
| WebSocket | `wss://api.pinkpineapple.app` |
| Dashboard | `https://dashboard.pinkpineapple.app` |
| Database | MongoDB Atlas (via Prisma) |
| Hosting | DigitalOcean (backend), Vercel (dashboard) |
| Files | DigitalOcean Spaces + Cloudinary |

## Build & Run

```bash
# Flutter app
cd app && flutter pub get && flutter run

# Backend
cd backend && npm install && npm run dev          # dev (ts-node-dev)
cd backend && npm run build && npm start           # production

# Dashboard
cd dashboard && npm install && npm run dev          # dev (localhost:3000)
cd dashboard && npm run build && npm start          # production
```

## Architecture

### App Structure (`app/lib/`)
```
core/
  binding/          GetX dependency injection
  const/            Colours (app_colors.dart), icons, images, user info
  controller/       Global controllers (image picker)
  global_widgets/   Reusable UI (buttons, text fields, snackbars, loading)
  local/            SharedPreferences wrapper
  network_caller/   HTTP client + endpoints.dart (all API URLs)
  services/         WebSocketService (chat)
  style/            Typography (global_text_style.dart)

feature/            22 feature modules, each with ui/ + controller/ + model/
  auth/             9 auth screens (splash -> login -> OTP -> profile setup)
  home/             Main discover screen (area filters, trending, tonight)
  home_bottom_nav/  5-tab navigation (Home, Explore, Tonight, Bookings, Profile)
  event_details/    Venue/event detail page
  event_details_ticket/   Ticket booking flow
  event_details_table/    VIP table selection
  event_details_table_options/  Table pricing
  event_details_checkout/       Booking confirmation
  explore/          Search + browse all venues
  bookings/         My bookings list
  favorites/        Saved venues
  profile_tab/      User profile, settings, edit, privacy, T&C
  chat_tab/         Real-time messaging (WebSocket)
  newsfeed/         Social feed (NOT core product - legacy)
  follow_followers/ Social graph (NOT core product - legacy)
  free_user/        Guest/unauthenticated browsing
  blocked_user/     Block management
  saved_posts/      Legacy social feature
  hidden_posts/     Legacy social feature
  report/           Report content
```

### Backend Modules (`backend/src/app/modules/`)
17 modules following controller -> service -> route pattern:
Auth, User, Events, Booking, Post, Comment, Like, Follow, BlockUser, ClubFavorite, EventFavorite, FavoritePost, AvailableDays, AvailableTime, ClubAvailableDays, ClubAvailableTimes, Notification

### Database Schema (Prisma)
**Core models**: User (roles: ADMIN/CLUB/USER), Events, EventTickets, TicketCharges, EventTable, TableCharges, Booking (type: TABLE/TICKET), Chat, Room, Notification
**Social models** (legacy): Post, Like, Comment, Follower, FavoritePost
**Enums**: BookingType, BookingStatus (PENDING/ACCEPTED/REJECTED), UserRole, UserStatus, EventStatus, FollowerStatus

### Dashboard Pages
**Auth**: login, register, forgot-password, verify-otp, reset-password
**Club/Manager**: /club/ (dashboard, events, bookings, messages, settings)
**Admin**: venues (list/new/edit), events, approvals, users, bookings, messages, settings

## Design System (LOCKED)

Source of truth: `docs/DESIGN-SYSTEM.md` and `docs/BRAND-GUIDELINES.md`. Do not change without Sascha's approval.

### Colours (as implemented in `app_colors.dart`)
```
Background:         #000000   pure black
Surface:            #1A1A1A   cards, inputs, overlays
Surface elevated:   #2A2A2A   modals, raised sheets

Rose-gold gradient: #8B4060 -> #C4707E -> #E8A0B0  (135deg, CTAs/buttons/active)
Rose-gold solid:    #C4707E   mid-gradient fallback

Text primary:       #FFFFFF
Text secondary:     #B0B0B0
Text muted:         #6B6B6B

Success:            #00C853
Warning/ratings:    #FFB800
Error:              #FF3B3B
```

### Typography
- **Venue names**: Bodoni Moda / Playfair Display, Bold, 32-40px
- **Headings**: Cormorant Garamond, Bold/700 (editorial luxury)
- **Body**: Poppins, Regular/400, 14-16px
- **Labels**: Poppins, Light/300, 12-14px, UPPERCASE, wide tracking
- **Category format**: `BEACH CLUB . ULUWATU` (centered dot)

### Design Principles
1. Dark-first -- venue photography pops on black
2. Photography-forward -- hero images sell, text supports
3. Minimal chrome -- thin borders, subtle shadows, breathe
4. Location-aware -- always show current area
5. Bali-native -- warm, golden, luxurious but relaxed

## Venue Database

38 venues seeded across 3 areas, 5 categories:
- **Canggu**: Miss Fish, Desa/Kitsune, Atlas, Jade, Saya Club, Muda By/Suka, etc.
- **Uluwatu**: Savaya, El Kabron, Sundays, etc.
- **Seminyak**: Da Maria (cross-listed Canggu for Hip Hop Wed), etc.
- **Categories**: Beach Clubs, Restaurants, Nightlife (all Canggu), Wellness, Events
- **ALL nightlife is Canggu** (confirmed Sascha 2026-03-30)

## Known Issues & Technical Debt

### Critical
- **No payment integration** -- Stripe installed but zero checkout/webhook code. Revenue model not functional.
- **No venue model** -- venues are User records with `role: CLUB`. No address, hours, price range, category, photo gallery, or editorial content fields.
- **No location/area system** -- no area model in Prisma schema, no geolocation filtering, no area selector endpoint.
- **Credential rotation needed** -- Fiverr team had access to all keys. JWT, DB, Stripe, email, Cloudinary, AWS, Firebase all need rotating.

### Moderate
- **Social features in production** -- newsfeed, posts, followers, likes, comments still compiled into live app. Not part of product direction.
- **Dummy data in live app** -- `fav_saved_hidden_post/controller/post_controller.dart` calls `loadDummyData()` on init.
- **Design system drift** -- `app_colors.dart`, `PROGRESS.md`, and `ASSESSMENT.md` each show different palettes. Code is truth.
- **No tests** -- backend has `"test": "echo \"Error: no test specified\""`. No Flutter test files.
- **Backend quality** -- `helpars/` typo folder, `console.log` in production, `feeAmount` stored as String not number, `updateIntoDb` accepts `data: any`.

### Minor
- **Open TODOs** -- search/filter (`TODO: If your API supports search`), OTP resend (`TODO: trigger resend OTP`), profile filtering (`TODO: Backend needs to fix the API`).
- **Flutter SDK pinned high** -- `sdk: ^3.9.0` requires latest Flutter.

## Key Decisions

- **Pink Pineapple stays on Flutter.** Never propose a React Native rewrite. Iterate on the live Flutter codebase.
- **Brand and design system are LOCKED.** Do not change without Sascha's approval.
- **Social features are NOT the product direction.** Focus is curated discovery + instant booking, not social media.
- **Browse-first, sign-up-at-booking.** No forced account creation for discovery.
- **Backend is kept and extended**, not replaced. Schema needs venue/location models added.

## Documentation

All in `docs/`:
- `DESIGN-SYSTEM.md` -- colour tokens, typography, component specs (LOCKED)
- `BRAND-GUIDELINES.md` -- full brand bible (LOCKED)
- `AUDIT-REPORT.md` -- security audit + code quality assessment
- `UI-UX-REDESIGN-ROADMAP.md` -- complete redesign plan
- `PROJECT-STATUS.md` -- deployment handoff
- `CHANGES-LOG.md`, `FIXES-APPLIED.md` -- work history
- `VENUE-BUILD-LOG.md` -- venue seeding log
- `MOBILE-BUILD-LOG*.md` -- build process docs

## Next Steps

1. Rotate all credentials (security critical)
2. Add Venue model to Prisma schema (separate from User)
3. Add area/location filtering to backend
4. Integrate Stripe payments (checkout flow + webhooks)
5. Set up Firebase project for push notifications
6. Source real venue photography (Sascha in Bali)
7. Remove or gate social features from Flutter app
8. User acquisition and growth
