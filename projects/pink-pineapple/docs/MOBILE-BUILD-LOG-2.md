# Pink Pineapple — Mobile Build Log Phase 2

**Date:** 2026-03-30
**Scope:** Remaining screens redesign, Tonight feature, backend schema update

---

## What Was Built

### TASK 1: Tonight Screen ✅
**File:** `lib/feature/venue/ui/tonight_screen.dart` (NEW)

Time-aware "What should I do tonight?" screen with three sections:
- **Sunset Sessions** — Beach clubs (filters `BEACH_CLUB` category)
- **Dinner** — Restaurants (filters `RESTAURANT` category)
- **Late Night** — Nightlife venues (filters `NIGHTLIFE` category)

Features:
- Header with "Tonight" title + formatted current date
- Each section: gradient icon badge, time range subtitle, horizontal scrolling venue cards
- Empty sections show "Nothing scheduled" in muted italic text
- Pull-to-refresh triggers `venueController.fetchVenues()`
- Custom `_TonightVenueCard` widget with hero image, gradient overlay, price badge, area + rating row
- Uses `Get.find<VenueController>()` (already registered by Discover screen)

### TASK 2: Bookings Screen Redesign ✅
**File:** `lib/feature/bookings/ui/bookings_list_page.dart` (OVERWRITTEN)

Complete PP-branded redesign:
- Black background, rose-gold accents throughout
- Custom segmented tab bar: "Upcoming" | "Past" with gradient active state
- Booking cards: dark surface, thumbnail on left, venue name, date (formatted with intl), party size, status badge
- Status badges: Pending = gold, Accepted = green, Rejected = red (with tinted background)
- Empty state: calendar icon, "No bookings yet" text, gradient "Explore Venues" CTA
- Pull-to-refresh
- Still uses existing `BookingsListController` and `BookingsListModel`

### TASK 3: Profile Screen Redesign ✅
**File:** `lib/feature/profile_tab/ui/profile_tab.dart` (OVERWRITTEN)

Complete PP-branded redesign:
- Black background
- Profile header: circular avatar with rose-gold gradient ring, name, email
- Stats row: Posts | Followers | Following in dark surface card with dividers
- Menu cards grouped into sections:
  - My Saved Venues (heart), My Bookings (calendar), Settings (gear)
  - Privacy Policy (shield), Terms & Conditions (document)
- Logout card with red icon and text
- Version number at bottom
- Uses existing `ProfileTabController` and `UserInfoController`

### TASK 4: Login Screen Redesign ✅
**File:** `lib/feature/auth/ui/1.login_ui.dart` (OVERWRITTEN)

Complete PP-branded login:
- Black background
- PP logo: "PINK" in bold white (letter-spacing 8), "PINEAPPLE" in thin rose-gold (letter-spacing 10)
- Tagline: "Your guide to Bali's best"
- Email & password fields: dark surface fill, rose-gold focus border, prefix icons
- Password show/hide toggle
- "Sign In" button: full-width rose-gold gradient pill
- "Forgot Password?" link in rose-gold
- "Don't have an account? Sign Up" at bottom
- Uses existing `LoginController`

### TASK 5: Splash Screen Redesign ✅
**File:** `lib/feature/auth/ui/0.splash_ui.dart` (OVERWRITTEN)

- Full black background
- Centered PP logo text: "PINK" bold white + "PINEAPPLE" thin rose-gold (same style as login)
- Rose-gold circular progress indicator below
- Uses existing `SplashScreenController` navigation logic

### TASK 6: Events ↔ Venues Backend Schema ✅
**File:** `backend-src/troyreed1725-backend-main/prisma/schema.prisma` (MODIFIED)

Changes to `Events` model:
- Added `venueId String? @db.ObjectId` (optional)
- Added `venue Venue? @relation(fields: [venueId], references: [id])`
- Added `@@index([venueId])` for query performance

Changes to `Venue` model:
- Added `events Events[]` relation field

This allows events to be linked to specific venues while keeping it backwards-compatible (venueId is optional).

### TASK 7: Category Pills Update ✅
**File:** `lib/feature/venue/widgets/category_pills.dart` (UPDATED)

- Added `ppCategories` constant with the 4 active categories:
  - Beach Clubs (`BEACH_CLUB`)
  - Restaurants (`RESTAURANT`)
  - Nightlife (`NIGHTLIFE`)
  - Wellness (`WELLNESS`)
- Removed CAFE from available categories
- Widget itself unchanged (still generic), but now exports the canonical category list

### TASK 8: Tonight Tab in Navigation ✅
**File:** `lib/feature/home_bottom_nav/ui/home_bottom_nav.dart` (UPDATED)

Updated from 4 tabs to 5:
1. **Discover** (home icon)
2. **Explore** (search icon)
3. **Tonight** (nights_stay/moon icon) — NEW
4. **Bookings** (calendar icon)
5. **Profile** (person icon)

- Imported `TonightScreen`
- Added to pages list at index 2
- Adjusted nav item widths from 72.w → 64.w to fit 5 items
- Font size reduced to 9.sp for nav labels to fit cleanly

---

## Design System Used

All screens follow the PP brand system defined in `app_colors.dart`:
- **Background:** `#000000` (pure black)
- **Surface:** `#1A1A1A` (dark cards)
- **Surface Elevated:** `#2A2A2A`
- **Brand Gradient:** `#8B4060` → `#E8A0B0` (rose-gold)
- **Text Primary:** `#FFFFFF`
- **Text Secondary:** `#B0B0B0`
- **Text Muted:** `#6B6B6B`
- **Semantic:** Success `#00C853`, Warning `#FFB800`, Error `#FF3B3B`

## Dependencies

The Tonight screen uses `intl` for date formatting — this package should already be in `pubspec.yaml` (used by Flutter localizations). If not, add:
```yaml
dependencies:
  intl: ^0.19.0
```

The Bookings screen also uses `intl` for date formatting.

## What's Next

- Wire up the "My Saved Venues" menu item to a saved venues screen
- Build a venue-specific events listing (now possible with venueId on Events)
- Add actual time-of-day filtering to Tonight screen (currently shows all venues in each category regardless of hour)
- Run `npx prisma generate` on backend after schema change
