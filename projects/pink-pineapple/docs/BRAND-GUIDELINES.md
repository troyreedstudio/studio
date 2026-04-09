<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
  h1 { color: #8B4060; border-bottom: 3px solid #8B4060; padding-bottom: 10px; font-size: 28px; }
  h2 { color: #8B4060; margin-top: 40px; font-size: 22px; }
  h3 { color: #C4707E; font-size: 18px; }
  table { border-collapse: collapse; width: 100%; margin: 15px 0; }
  th { background-color: #8B4060; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) { background-color: #f9f5f7; }
  code { background: #f4e8ed; padding: 2px 6px; border-radius: 3px; color: #8B4060; }
  .color-swatch { display: inline-block; width: 18px; height: 18px; border-radius: 3px; vertical-align: middle; margin-right: 6px; border: 1px solid #ccc; }
  .logo-container { text-align: center; background: #000000; padding: 40px 20px; margin-bottom: 30px; border-radius: 8px; }
  .logo-container img { max-width: 400px; width: 100%; }
</style>

<div class="logo-container">
  <img src="logo_primary_dark.jpg" alt="Pink Pineapple Logo" />
</div>

# PINK PINEAPPLE — Brand Guidelines

**Version:** 1.0 — LOCKED  
**Date:** March 2026  
**Prepared by:** Frankie (AI Brand Strategist)  
**For:** Pink Pineapple — Bali Lifestyle App

---

## 1. Brand Overview

**Pink Pineapple** is the curated lifestyle guide to Bali — covering the best beach clubs, restaurants, nightlife, and wellness experiences across Canggu, Uluwatu, Seminyak, and Ubud.

**Positioning:** Premium, curated, insider — not crowdsourced. Every venue is hand-picked. Quality over quantity.

**Target Audience:** Expats, digital nomads, and high-end tourists (25–45) in Bali.

**Brand Personality:** Luxurious but approachable. Nightlife energy meets editorial polish. Bali-native, not tourist-generic.

---

## 2. Logo

### Primary Logo
- **"PINK"** — Bold geometric sans-serif, heavy weight (Black/900)
- **"PINEAPPLE"** — Thin, wide letter-spacing (0.2em+), elegant sans-serif, Light/300 weight
- Metallic rose-gold gradient applied to "PINK"
- "PINEAPPLE" in white on dark backgrounds

### Logo Usage Rules
- **Primary application:** On black/dark backgrounds (dark-first brand)
- **Minimum clear space:** Height of the letter "P" on all sides
- **Never** stretch, rotate, recolour, or add effects to the logo
- **Never** place on busy photography without a dark overlay
- **Never** use on light backgrounds without an approved light variant

### Logo Files
- `logo_primary_dark.jpg` — Primary logo on black background

---

## 3. Colour Palette

### Core Brand Colours

| Colour | Name | Hex Code | Usage |
|--------|------|----------|-------|
| 🟤 | Rose-Gold Dark | `#8B4060` | Gradient start, deep accents |
| 🩷 | Rose-Gold Mid | `#C4707E` | Solid buttons, active states, primary brand |
| 🌸 | Rose-Gold Light | `#E8A0B0` | Gradient end, soft highlights |
| ⬛ | Black | `#000000` | Primary backgrounds |
| 🔲 | Dark Surface | `#1A1A1A` | Cards, overlays, input fields |
| ◼️ | Elevated Surface | `#2A2A2A` | Modals, elevated cards |
| ⬜ | White | `#FFFFFF` | Primary text, headlines |

### Brand Gradient
- **Direction:** 135° (top-left to bottom-right)
- **CSS:** `linear-gradient(135deg, #8B4060, #E8A0B0)`
- **Used for:** CTAs, buttons, highlights, accent borders, logo treatment

### Text Colours

| Colour | Name | Hex Code | Usage |
|--------|------|----------|-------|
| ⬜ | Primary Text | `#FFFFFF` | Headlines, main body text |
| 🔘 | Secondary Text | `#B0B0B0` | Descriptions, supporting text |
| ⚫ | Muted Text | `#6B6B6B` | Timestamps, tertiary info |

### Semantic / Status Colours

| Colour | Name | Hex Code | Usage |
|--------|------|----------|-------|
| 🟢 | Success Green | `#00C853` | Open status, confirmations |
| 🟡 | Warning Gold | `#FFB800` | Closing soon, ratings, stars |
| 🔴 | Error Red | `#FF3B3B` | Closed status, errors |

---

## 4. Typography

### Type Hierarchy

| Element | Font | Weight | Size | Tracking | Notes |
|---------|------|--------|------|----------|-------|
| Venue Names | Playfair Display (serif) | Bold | 32–40px | Normal | Editorial feel |
| "PINK" Logo | Geometric Sans | Black/900 | — | Normal | Brand mark only |
| "PINEAPPLE" / Labels | Sans-serif | Light/300 | 12–14px | Wide (0.2em+) | Always uppercase |
| Section Headers | Sans-serif | Semi-bold Italic | 20–24px | Normal | e.g. "Upcoming Events" |
| Body Text | Inter or DM Sans | Regular/400 | 14–16px | Normal | Clean, modern |
| Tags / Badges | Sans-serif | Medium/500 | 11–12px | Wide (0.1em) | Category pills |

### Category & Area Labels
- Always **UPPERCASE**
- Wide letter-spacing
- Rose-gold colour
- Format: `BEACH CLUB · ULUWATU` (separated by centered dot ·)

---

## 5. UI Components

### Buttons

| Type | Style | Example Use |
|------|-------|-------------|
| **Primary CTA** | Rose-gold gradient fill, white text, pill shape (rounded-full) | "Book a Table", "Buy Tickets" |
| **Secondary CTA** | Transparent with rose-gold gradient border, gradient text, pill shape | "VIP Reservation", "See All" |
| **Ticket Pill** | Small rose-gold gradient pill, white text | Inline ticket buttons on event cards |
| **Ghost** | Transparent background, rose-gold text | Tertiary actions |

### Cards

| Type | Style |
|------|-------|
| **Venue Card** | Dark surface (`#1A1A1A`), rounded-xl, hero image top half, info below |
| **Event Card** | Dark surface with subtle rose-gold left border accent |
| **Category Row** | Horizontal scroll, fixed-width venue cards |

### Navigation

| Element | Style |
|---------|-------|
| **Bottom Nav** | 4 tabs, icon + optional label, active = rose-gold dot indicator below |
| **Area Pills** | Horizontal scroll pills — active = gradient fill, inactive = outline |
| **Back Button** | "← Back" in white, positioned top-left over hero images |

### Status Indicators

| Status | Style |
|--------|-------|
| **Open** | Green dot + "Open · Closes midnight" |
| **Closed** | Red dot + "Closed · Opens 11am" |
| **Closing Soon** | Yellow dot + "Closing soon" |

### Ratings
- Number (e.g. "4.9") in gold/amber (`#FFB800`)
- Review count in muted text: "(2,841 reviews)"

---

## 6. Photography Standards

### Hero Images
- **Required:** Real photography — NOT AI-generated, NOT stock
- **Style:** Golden hour, dramatic lighting, wide/cinematic framing
- **Resolution:** Minimum 1920px wide
- **Acceptable sources:** Venue press photos, professional photographers, curated personal photos

### NOT Acceptable
- Google Maps screenshots
- Phone selfies
- AI-generated images
- Generic stock photos
- Low-resolution or poorly lit images

### Fallback
If no quality hero image exists, use a dark moody placeholder with the venue name overlaid until real photography is sourced.

---

## 7. Design Principles

1. **Dark-First** — Dark backgrounds make venue photography pop (golden hour, neon nightlife)
2. **Photography-Forward** — Hero images sell; text supports
3. **Minimal Chrome** — Thin borders, subtle shadows, let content breathe
4. **Location-Aware** — Always show which area the user is browsing
5. **Bali-Native** — The UI should feel like Bali: warm, golden, luxurious but relaxed

---

## 8. Screen Layout Reference

### Venue Detail Screen
```
┌──────────────────────────────────┐
│  [Full-bleed hero photograph]    │
│                                  │
│  ← Back                         │
│                                  │
│  SAVAYA                          │  ← Playfair Display, bold, white
│  BEACH CLUB · ULUWATU            │  ← Light, wide-tracked, rose-gold
│                                  │
│  🟢 Open · Closes midnight      │
│                           4.9 ★  │  ← Gold rating
│                    (2,841 reviews)│
│                                  │
│  Clifftop amphitheatre...        │  ← Body text, secondary grey
│                                  │
│  ╔══════════════════════════╗    │
│  ║     BOOK A TABLE         ║    │  ← Primary CTA (gradient fill)
│  ╚══════════════════════════╝    │
│  ┌──────────────────────────┐    │
│  │    VIP RESERVATION       │    │  ← Secondary CTA (outline)
│  └──────────────────────────┘    │
│                                  │
│  Upcoming Events                 │  ← Section header, italic
│  ┌──────────────────────────┐    │
│  │ Fisher — Live Set [TICKETS]│  │
│  │ Sat 28 Mar · From $45    │    │
│  └──────────────────────────┘    │
│                                  │
│  ●    ○    ○    ○               │  ← Bottom nav
└──────────────────────────────────┘
```

---

## 9. Developer Reference

### Flutter Colour Constants
```dart
class PinkPineappleColors {
  static const Color background = Color(0xFF000000);
  static const Color surface = Color(0xFF1A1A1A);
  static const Color surfaceElevated = Color(0xFF2A2A2A);
  static const Color gradientStart = Color(0xFF8B4060);
  static const Color gradientMid = Color(0xFFC4707E);
  static const Color gradientEnd = Color(0xFFE8A0B0);
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF6B6B6B);
  static const Color success = Color(0xFF00C853);
  static const Color warning = Color(0xFFFFB800);
  static const Color error = Color(0xFFFF3B3B);
}
```

### Tailwind Config
```javascript
colors: {
  pp: {
    bg: '#000000',
    surface: '#1A1A1A',
    'surface-elevated': '#2A2A2A',
    rose: {
      dark: '#8B4060',
      DEFAULT: '#C4707E',
      light: '#E8A0B0',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      muted: '#6B6B6B',
    },
    success: '#00C853',
    warning: '#FFB800',
    error: '#FF3B3B',
  },
}
```

### CSS Custom Properties
```css
:root {
  --pp-bg: #000000;
  --pp-surface: #1A1A1A;
  --pp-surface-elevated: #2A2A2A;
  --pp-gradient-start: #8B4060;
  --pp-gradient-mid: #C4707E;
  --pp-gradient-end: #E8A0B0;
  --pp-gradient: linear-gradient(135deg, #8B4060, #E8A0B0);
  --pp-text-primary: #FFFFFF;
  --pp-text-secondary: #B0B0B0;
  --pp-text-muted: #6B6B6B;
  --pp-success: #00C853;
  --pp-warning: #FFB800;
  --pp-error: #FF3B3B;
}
```

---

## 10. Brand Do's and Don'ts

### ✅ Do
- Use dark backgrounds as the default
- Let photography be the hero
- Apply rose-gold gradient to primary CTAs
- Use wide letter-spacing for category labels
- Keep layouts clean with generous whitespace

### ❌ Don't
- Use light/white backgrounds as default
- Clutter screens with too many elements
- Use generic stock photography
- Mix brand colours with off-palette colours
- Use the logo on busy, unobscured backgrounds
- Add drop shadows or glows to the logo

---

*© 2026 Pink Pineapple. All rights reserved.*
*This document is confidential and intended for internal use and approved design partners only.*
