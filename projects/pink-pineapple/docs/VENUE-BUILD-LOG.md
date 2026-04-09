# Venue Backend Build Log

**Date:** 2026-03-30
**Task:** Add proper Venue & Area models to Pink Pineapple backend

## What Was Done

### 1. Prisma Schema (`prisma/schema.prisma`)
Added new enums and models:
- `VenueCategory` enum: `BEACH_CLUB`, `RESTAURANT`, `NIGHTLIFE`, `WELLNESS`, `CAFE`
- `VenueStatus` enum: `ACTIVE`, `PENDING`, `CLOSED`
- `Area` model: id, name (unique), slug (unique), timestamps, venue relation
- `Venue` model: full venue profile with name, slug, description, category, area relation, images, location, contact info, price range, rating/reviews, hours, features, status, featured flag. Indexed on `category`, `areaId`, `featured`.

### 2. Venue Module (`src/app/modules/Venue/`)
Created following the existing Events module pattern:

**Files created:**
- `Venue.interface.ts` — Filter types and searchable/filterable field arrays
- `Venue.validation.ts` — Zod schemas for create/update (matches `validateRequest` middleware pattern — validates `req.body` directly)
- `Venue.service.ts` — Full CRUD + getFeatured + getTonightVenues with pagination, search, filters
- `Venue.controller.ts` — Express handlers using `catchAsync`, `sendResponse`, `pick`
- `Venue.routes.ts` — Route definitions

**API Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/venues` | Public | List with filters (category, areaId, featured, status, searchTerm) + pagination |
| GET | `/venues/featured` | Public | Featured venues for home carousel |
| GET | `/venues/tonight` | Public | Venues + tonight's events (accepts `?timezone=`) |
| GET | `/venues/:id` | Public | Single venue detail |
| POST | `/venues` | ADMIN | Create venue (validated) |
| PATCH | `/venues/:id` | ADMIN | Update venue |
| DELETE | `/venues/:id` | ADMIN | Delete venue |

### 3. Area Module (`src/app/modules/Area/`)
**Files created:**
- `Area.validation.ts` — Zod schemas
- `Area.service.ts` — getAllAreas (with venue count), getVenuesByAreaSlug
- `Area.controller.ts` — Express handlers
- `Area.routes.ts` — Route definitions

**API Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/areas` | Public | All areas with active venue counts |
| GET | `/areas/:slug/venues` | Public | Venues in a specific area |

### 4. Route Registration (`src/app/routes/index.ts`)
Added imports and route entries for:
- `/venues` → `VenueRoutes`
- `/areas` → `AreaRoutes`

### 5. Seed Script (`src/seed-venues.ts`)
Seeds 4 areas and 22 venues using Prisma upserts (idempotent by slug):
- **6 Beach Clubs:** Savaya, Finns, Sundays, El Kabron, Potato Head, La Brisa
- **5 Restaurants:** Kong, Mason, Da Maria, Sardine, Locavore
- **3 Nightlife:** Jenja, Vault, Mirror Lounge & Club
- **3 Wellness:** The Practice, Spa Alila, Ubud Yoga Centre
- **3 Cafes:** Crate Cafe, Revolver, Seniman Coffee

Run with: `npx ts-node src/seed-venues.ts` (after `npx prisma generate`)

## Key Design Decisions
- Venue endpoints are **public** (no auth) for read — the app needs unauthenticated venue browsing
- Write operations (POST/PATCH/DELETE) require **ADMIN** role
- Default filter shows only `ACTIVE` venues
- `/venues/tonight` returns both venues and tonight's events as a combined payload
- Featured endpoint is a separate route for the home carousel (no pagination needed)
- Area list includes `_count.venues` for showing venue counts per area in the UI

## Next Steps
- Run `npx prisma generate` to regenerate the Prisma client
- Run `npx ts-node src/seed-venues.ts` to populate the database
- Link Events to Venues (add `venueId` to Events model) — currently events are tied to User
- Add image upload support to venue create/update endpoints
- Add VenueFavorite model for user wishlists
