# Pink Pineapple Mobile — Build Log

**Date:** 2026-03-30
**Scope:** Complete UI overhaul — venue-first design with new navigation, screens, and brand colours.

---

## Files Modified

### 1. `lib/core/const/app_colors.dart` — REPLACED
- Removed old dusty rose/brown palette
- Added PP brand colours: black background, dark surfaces, rose-gold gradients
- Added semantic colours (success, warning, error, rating)
- Added `brandGradient` and legacy aliases for backward compat

### 2. `lib/core/network_caller/endpoints.dart` — UPDATED
- Added venue endpoints: `allVenues`, `featuredVenues`, `tonightVenues`, `venueDetails`
- Added area endpoints: `allAreas`, `areaVenues`

### 3. `lib/main.dart` — REPLACED
- Dark theme with PP brand colours
- Removed `SystemUiMode.immersiveSticky` (was hiding status bar)
- Set `edgeToEdge` mode with transparent status bar
- Updated EasyLoading to use dark surface colours
- Set Inter as default font family
- Added full dark ColorScheme

### 4. `lib/feature/home_bottom_nav/ui/home_bottom_nav.dart` — REPLACED
- Removed old GNav dependency (google_nav_bar)
- New custom 4-tab bottom nav: Discover, Explore, Bookings, Profile
- Black surface background, rose-gold active indicator line
- Clean minimal icons with active/inactive states
- Pages: DiscoverScreen, ExploreScreen, BookingsListPage, ProfileTabPage

---

## Files Created

### 5. `lib/feature/venue/model/venue_model.dart` — NEW
- `VenueModel` — 22 fields including nested `AreaModel` for area
- `AreaModel` — id, name, slug
- Both with `fromJson` and `toJson`
- Handles both `_id` and `id` from API

### 6. `lib/feature/venue/controller/venue_controller.dart` — NEW
- GetX controller with reactive state
- `venues`, `featuredVenues`, `areas` as RxList
- `selectedVenue` as Rx<VenueModel?>
- `selectedArea`, `selectedCategory` as RxString filters
- Methods: `fetchVenues()`, `fetchFeaturedVenues()`, `fetchVenueById()`, `fetchAreas()`, `fetchVenuesByArea()`
- `filteredVenues` getter combines area + category filters
- Uses existing `NetworkConfigV1` + `ApiRequestHandler` pattern

### 7. `lib/feature/venue/ui/discover_screen.dart` — NEW
- Home/Discover tab with curated layout
- Gradient "PINK PINEAPPLE" logo header + notifications icon
- Featured venue carousel (PageView with gradient overlay, indicators)
- Area filter pills (connected to VenueController)
- Category sections: Beach Clubs, Restaurants, Nightlife, Wellness
- Each section = horizontal scrolling venue cards
- Pull-to-refresh support

### 8. `lib/feature/venue/ui/venue_detail_screen.dart` — NEW
- Full-bleed hero image with back button overlay
- Large bold venue name
- Rose-gold uppercase "CATEGORY · AREA" subtitle
- Status indicator (green/red dot + Open/Closed)
- Gold star rating with review count
- Operating hours display
- Description text
- "Book a Table" gradient CTA button
- "VIP Reservation" outline CTA button
- Feature chips in Wrap layout
- Contact rows (phone, website, instagram) with tap-to-launch
- Address with location icon

### 9. `lib/feature/venue/ui/explore_screen.dart` — NEW
- Search bar with dark surface, rose-gold cursor
- Area filter pills (horizontal scroll)
- Category filter pills: All, Beach Clubs, Restaurants, Nightlife, Wellness, Cafes
- "Open Now" toggle chip with gradient active state
- 2-column responsive grid of venue cards
- Combined search + filter logic
- Empty state with icon
- Loading indicator

### 10. `lib/feature/venue/widgets/venue_card.dart` — NEW
- Reusable venue card widget
- CachedNetworkImage hero with placeholder/error states
- Venue name, category dot + area text, gold star rating
- Dark surface card with rounded corners
- Configurable width, onTap callback

### 11. `lib/feature/venue/widgets/area_pills.dart` — NEW
- Horizontal scrolling area filter pills
- Active = brand gradient fill, inactive = outlined
- Generic — takes list of area names + callback

### 12. `lib/feature/venue/widgets/category_pills.dart` — NEW
- Horizontal scrolling category filter pills
- Same active/inactive pattern as area pills

### 13. `lib/feature/venue/widgets/gradient_button.dart` — NEW
- Reusable PP brand button
- Two variants: filled (brand gradient) and outline
- Optional leading icon
- Full-width by default, configurable

---

## What's Preserved (Not Touched)

- Auth flow (`lib/feature/auth/`)
- Bookings (`lib/feature/bookings/`)
- Chat (`lib/feature/chat_tab/`)
- Profile (`lib/feature/profile_tab/`)
- Network layer (`network_config.dart`, `network_config_v2.dart`)
- Local storage (`local_data.dart`)
- WebSocket service
- Home nav controller (`home_nav_controller.dart`) — same API, works with new nav
- All existing models, controllers for events/users/posts

---

## Dependencies Used (already in pubspec)

- `get` — state management + navigation
- `flutter_screenutil` — responsive sizing
- `cached_network_image` — venue images
- `url_launcher` — contact links in venue detail
- `logger` — controller logging

## Dependencies Removed from Nav

- `google_nav_bar` — replaced with custom bottom nav (can remove from pubspec if desired)

---

## Next Steps

- [ ] Build venue API endpoints on backend
- [ ] Add booking flow integration from venue detail CTAs
- [ ] Photo gallery view on venue detail
- [ ] Map view for venue locations
- [ ] Reviews/ratings screen
- [ ] Push notification integration
- [ ] Remove `google_nav_bar` from pubspec.yaml if not used elsewhere
