# LMC Filming Policy

**Version 1.0 — Engineering + legal source of truth · 2026-06-06**

This document defines (1) what categories LMC will dispatch Scouts to, (2) the venue-tier system the dispatcher uses to route or refuse jobs, (3) per-category filming rules, and (4) the takedown process. It's the engineering spec for the dispatch engine and the source of truth for legal review.

The companion Scout Code of Conduct (`SCOUT-CONDUCT.md`) is the Scout-facing summary of these same rules.

---

## 1. The venue-tier system

Every venue in `app/data/markets.ts` is tagged with a `filmingPolicy` field:

| Tier | Meaning | Scout behavior |
|---|---|---|
| 🟢 **GREEN** | Public-facing or public-policy venue. Exterior, interior public areas, queues OK. | Standard filming guidelines apply. |
| 🟡 **YELLOW** | Restricted venue. Exterior + queue only — no filming inside. | Scout dispatched but instructed to film exterior only. App reminder on filming screen. |
| 🔴 **RED** | Forbidden venue. Filming not permitted at all. | Dispatch declined. Seeker informed at request time. |

**Default behavior** when a venue has no explicit `filmingPolicy`: fall back to the category default (next section).

## 2. Category defaults

When a venue doesn't have an explicit policy override, use the category default:

| Category | Default tier | Rationale |
|---|---|---|
| Nightclub | 🟡 YELLOW | Most clubs forbid filming inside. Exterior + queue is the LMC use case anyway. |
| Restaurant | 🟢 GREEN | Public dining area is fair game. No kitchens, no close-ups of diners. |
| Beach Club | 🟢 GREEN | Public-facing pool/beach area. No private cabanas. |
| Members Club | 🟡 YELLOW | Private by definition. Exterior only unless specific venue partnership in place. |
| Hotel | 🟢 GREEN | Public lobby + concierge area. No guest rooms, no spa interior. |
| Gym | 🟡 YELLOW | Lobby + cardio floor wide shots. **Never locker rooms, weight floor close-ups, or trainer-led classes.** |
| Airport | 🟡 YELLOW | Curbside + check-in lobby only. **TSA forbids filming security checkpoints.** Never gates or jet bridges. |
| DMV | 🟢 GREEN | Public lobby + queue is the entire use case. No documents in frame, no interview windows. |
| Government | 🟡 YELLOW | Depends on building. Courts/police/secure: RED. General lobbies: GREEN. Default cautious. |
| Retail | 🟢 GREEN | Sales floor wide shots. No cashiers in frame, no customer close-ups, no back-of-house. |
| Events / Stadium | 🟢 GREEN | Concourse + entrance + queue. No field of play if ticketed event in progress. |
| **Hospital** | 🔴 RED | HIPAA risk. No exceptions in v1. |
| **School** | 🔴 RED | Children + private property. No exceptions in v1. |
| **Private residence** | 🔴 RED | No exceptions ever. |
| **Court / Police station** | 🔴 RED | Security-sensitive. No exceptions. |
| **Private event (wedding, conference)** | 🔴 RED | Need venue + organizer permission. Reject in v1. |

## 3. Per-category filming rules

Even on 🟢 GREEN venues, category-specific guidelines apply. These show up in the Scout app on the filming screen as a one-line reminder.

### Nightclub (🟡 YELLOW default)
- Exterior + queue ONLY
- Wide shots of the line, the door, the staff
- No filming of strangers' faces in the queue
- No audio
- 15 seconds max (30s for Partner Interior tier)
- Standard delivery (10 min) preferred over Priority — clubs check phones at the door

### Restaurant (🟢 GREEN default)
- Public dining area, host stand, exterior, queue
- Wide shots only — no close-ups of diners
- No kitchen, no service areas, no back-of-house
- Menus and ambient signage OK
- Bar area OK if no patron close-ups
- No audio (audio recording in restaurants where patrons converse is a two-party consent issue)

### Hotel (🟢 GREEN default)
- Lobby, exterior, valet area, public bar
- Wide shots of activity level
- No guest rooms, no spa interior, no pool deck close-ups of guests
- Conference / event rooms: only if event is public and not ticketed

### Gym (🟡 YELLOW default)
- Lobby, cardio floor wide shots, exterior, parking lot
- **Never locker rooms, showers, or saunas**
- Weight floor: wide shot only, no member close-ups
- Trainer-led classes: skip unless venue partner has explicit consent
- No audio

### Airport (🟡 YELLOW default)
- Curbside drop-off / pick-up area
- Check-in counter lobby (before security)
- Baggage claim
- **Never security checkpoints. Never gates. Never customs.**
- Wide shots only, no traveler close-ups
- No filming uniformed TSA or law enforcement performing duties

### DMV / Public Government Service (🟢 GREEN default)
- Public lobby + queue area is the entire use case
- Wait time, line length, counter staffing visibility
- **No documents in frame** (drivers licenses, IDs, paperwork — privacy risk)
- No interview windows where personal info is discussed
- No audio
- Wide shots only

### Retail / Mall (🟢 GREEN default)
- Sales floor wide shots, entrance, parking lot
- No cashiers, no customer close-ups
- No fitting rooms, no back-of-house
- No tagged merchandise close-ups (retailers can claim IP issues with branded product photography)
- Window displays + exterior signage OK

### Events / Stadium / Arena (🟢 GREEN default)
- Concourse, entrance, exterior, queue
- Atmosphere shots fine — what's the energy of arriving
- **No field of play / stage / performance area** if ticketed event is in progress (broadcasting rights conflict)
- No filming of performers, athletes, ticketed talent
- No filming of children attending
- Pre-event and post-event filming generally fine; mid-event restricted

### Beach Club / Pool (🟢 GREEN default)
- Public-facing pool + beach area
- No private cabanas, no individual patrons in close-up
- No filming children
- No audio

## 4. Venue policy override flow

A venue's `filmingPolicy` can be set per-venue, overriding the category default. Two ways this happens:

1. **Manual research** — at venue onboarding, the LMC ops team researches each launch venue and assigns a tier based on their actual posted policies, prior incidents, and category default.
2. **Scout-triggered downgrade** — when a Scout uses **TROUBLE HERE** with reason "Hostile staff" or "Can't safely enter", the venue's `filmingPolicy` is auto-degraded one tier (🟢 → 🟡, 🟡 → 🔴). Ops reviews within 24h and either confirms or reverts.
3. **Venue partnership upgrade** — venues that partner with LMC sign a filming-permitted addendum and get manually upgraded (typically 🟡 → 🟢 with category-appropriate exceptions).

## 5. Clip auto-review pipeline (Phase 2 — backend dependency)

Every clip runs through these gates before delivery:

| Gate | Tool | Action on failure |
|---|---|---|
| Geofence check | GPS-stamped clip vs. venue coordinates | Reject. Notify Scout. No payment. |
| Signage / venue match | OCR + venue metadata | Soft-flag. Ops review. |
| Face detection / blur | iOS Vision API on device | Blur applied before upload. If blur fails, soft-flag for review. |
| Children detection | Vision API age estimator | Reject. Notify Seeker, refund. |
| Audio strip | Default-mute enforced | If audio detected on upload, audio track stripped server-side. |
| Duration check | 15s max (Standard/Priority) · 30s max (Partner Interior) | Trim or reject. |
| Cooldown check | 20 min per Scout per venue | Reject + Scout notified. |

## 6. Takedown process

Any party — venue, individual, third party — can request takedown via `legal@letmecheck.app` (or in-app form once built).

| Step | SLA |
|---|---|
| Acknowledge receipt | 4 hours |
| Identify clip + remove from CDN | 24 hours |
| Notify Scout (FYI, not punitive for in-policy footage) | 48 hours |
| Document in compliance log | 72 hours |

Repeat takedown requests from the same venue auto-degrade the venue's tier and flag for ops review.

## 7. Data retention

- Delivered clips remain on Mux CDN for 30 days, then deleted (unless flagged for dispute/legal hold)
- Geofence + GPS metadata retained for 12 months (verification audit trail)
- Scout-side recordings: never persisted on device; uploaded directly to Mux
- Seeker-purchased clips: streaming only via signed URLs, no permanent download in v1

## 8. Categories explicitly NOT supported in v1

| Category | Why excluded |
|---|---|
| Schools (K–12, daycare, college campuses with minors) | Children + private property |
| Hospitals + medical clinics | HIPAA + patient privacy |
| Courts + police stations | Security-sensitive |
| Military bases | Federal restrictions |
| Private residences | No expectation any of this is OK |
| Religious services | Cultural + privacy sensitivity |
| Private weddings, funerals, ceremonies | Need explicit organizer permission |
| Locker rooms, bathrooms, dressing rooms (regardless of venue) | Privacy bright-line |
| Adult venues / strip clubs | Right-of-publicity + venue policy + brand reasons |

## 9. Open questions for attorney

1. Indemnification language in the Scout Code of Conduct — does it actually hold if a Scout commits a violation that causes harm to a third party?
2. Right of publicity — is auto-face-blur sufficient defense, or do we need an explicit "you may appear in background of LMC clips" disclosure at the venue level?
3. Two-party consent audio — blanket no-audio rule v. per-state opt-in. Which is operationally cleaner AND legally defensible?
4. DMCA-style takedown vs. simpler takedown — is the 24h SLA + ack within 4h enough?
5. Venue trespass — if a Scout films from a public sidewalk facing a private venue, does the venue have any standing to demand the clip be removed?
6. International expansion — UK, Canada, Australia have different privacy regimes. Phase 2 problem.

## 10. Open questions for engineering

1. `filmingPolicy` field on Venue type — done in markets.ts. Dispatch engine reads this on request creation.
2. Face blur on-device — confirm iOS Vision API supports blur (not just detection) at video framerate.
3. Audio strip — server-side via Mux or device-side via vision-camera flag?
4. Takedown form — internal admin dashboard + public email handler. Stripe-style ticketing.
5. Compliance log — separate Supabase table with audit trail, immutable, append-only.
