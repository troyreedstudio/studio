# 🍍 Pink Pineapple — Design System (LOCKED)

**Source:** Original wireframes by Frankie (pre-reset), confirmed by Sascha 2026-03-29

---

## Brand Assets
- `logo_primary_dark.jpg` — primary logo on black
- `wireframe_venue_detail.jpg` — venue detail screen wireframe (Savaya example)

---

## Colour Tokens

### Core
| Token | Hex | Usage |
|-------|-----|-------|
| `--pp-bg` | `#000000` | App background |
| `--pp-surface` | `#1A1A1A` | Cards, input fields, overlays |
| `--pp-surface-elevated` | `#2A2A2A` | Elevated cards, modals |
| `--pp-text-primary` | `#FFFFFF` | Headlines, primary text |
| `--pp-text-secondary` | `#B0B0B0` | Descriptions, secondary info |
| `--pp-text-muted` | `#6B6B6B` | Timestamps, tertiary info |

### Brand Gradient (Rose-Gold)
| Token | Hex | Usage |
|-------|-----|-------|
| `--pp-gradient-start` | `#8B4060` | Gradient left/top (deep rose) |
| `--pp-gradient-mid` | `#C4707E` | Gradient midpoint (solid fallback) |
| `--pp-gradient-end` | `#E8A0B0` | Gradient right/bottom (soft pink) |
| `--pp-gradient` | `linear-gradient(135deg, #8B4060, #E8A0B0)` | Buttons, accents, highlights |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--pp-success` | `#00C853` | Open status, confirmations |
| `--pp-warning` | `#FFB800` | Closing soon, limited availability |
| `--pp-error` | `#FF3B3B` | Errors, closed status |
| `--pp-rating` | `#FFB800` | Star ratings |
| `--pp-nav-active` | `#C4707E` | Active tab indicator |

---

## Typography

### Hierarchy
| Element | Style | Weight | Size | Tracking |
|---------|-------|--------|------|----------|
| **Venue name** | Didone serif (Bodoni Moda / PP Editorial New) | Bold/700 | 32-40px | Normal |
| **"PINK" logo** | Geometric sans | Black/900 | — | Normal |
| **"PINEAPPLE" / Category labels** | Sans-serif | Light/300 | 12-14px | Wide (0.2em+) |
| **Section headers** | Sans-serif (Montserrat/Inter) | Semi-bold/600 | 20-24px | Normal |
| **Body text** | Inter / DM Sans | Regular/400 | 14-16px | Normal |
| **Labels/tags** | Sans-serif | Medium/500 | 11-12px | Wide (0.1em) |

### Category + Area Format
- Always uppercase
- Wide letter-spacing
- Rose-gold/pink colour
- Format: `BEACH CLUB · ULUWATU` (separated by centered dot)

---

## Components

### Buttons
| Type | Style | Usage |
|------|-------|-------|
| **Primary CTA** | Solid rose-gold gradient fill, white text, rounded-full (pill) | "Book a Table", "Buy Tickets" |
| **Secondary CTA** | Ghost/outline with rose-gold gradient border, gradient text, rounded-full | "VIP Reservation", "See All" |
| **Ticket pill** | Small rose-gold gradient, white text, rounded-full | Inline ticket CTAs on event cards |

### Cards
| Type | Style |
|------|-------|
| **Venue card** | Dark surface (#1A1A1A), rounded-xl, hero image top, info below |
| **Event card** | Dark surface with subtle rose-gold left border accent |
| **Category row** | Horizontal scroll, venue cards in fixed-width columns |

### Navigation
| Element | Style |
|---------|-------|
| **Bottom nav** | 4 tabs, icon + optional label, active = rose-gold dot/indicator below |
| **Back button** | "← Back" in white, top-left over hero image |
| **Area pills** | Horizontal scroll pills, active = gradient fill, inactive = outline |

### Status Indicators
| Status | Style |
|--------|-------|
| **Open** | Green dot (#00C853) + "Open · Closes midnight" |
| **Closed** | Red dot (#FF3B3B) + "Closed · Opens 11am" |
| **Closing soon** | Yellow dot (#FFB800) + "Closing soon" |

### Ratings
- Number display (e.g. "4.9") in gold/amber
- Review count in muted text: "(2,841 reviews)"

---

## Screen References

### Venue Detail (from wireframe)
```
┌──────────────────────────────┐
│  [Full-bleed hero photo]     │
│                              │
│  ← Back                     │
│                              │
│  SAVAYA                      │  ← Display serif, bold, white
│  BEACH CLUB · ULUWATU        │  ← Light, wide-tracked, rose-gold
│                              │
│  🟢 Open · Closes midnight  4.9 (2,841 reviews)
│                              │
│  Clifftop amphitheatre...    │  ← Body text, light grey
│                              │
│  [═══ BOOK A TABLE ═══]     │  ← Primary CTA (gradient fill)
│  [─── VIP RESERVATION ──]   │  ← Secondary CTA (outline)
│                              │
│  Upcoming Events             │  ← Section header, italic
│  ┌────────────────────────┐  │
│  │ Fisher — Live Set  [TICKETS] │  ← Event card
│  │ Sat 28 Mar · From $45 │  │
│  └────────────────────────┘  │
│                              │
│  ●    ○    ○    ○           │  ← Bottom nav, first active
└──────────────────────────────┘
```

---

## Flutter Colour Constants (for mobile)
```dart
class PinkPineappleColors {
  // Core
  static const Color background = Color(0xFF000000);
  static const Color surface = Color(0xFF1A1A1A);
  static const Color surfaceElevated = Color(0xFF2A2A2A);
  
  // Brand gradient
  static const Color gradientStart = Color(0xFF8B4060);
  static const Color gradientMid = Color(0xFFC4707E);
  static const Color gradientEnd = Color(0xFFE8A0B0);
  
  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF6B6B6B);
  
  // Semantic
  static const Color success = Color(0xFF00C853);
  static const Color warning = Color(0xFFFFB800);
  static const Color error = Color(0xFFFF3B3B);
  static const Color rating = Color(0xFFFFB800);
  static const Color navActive = Color(0xFFC4707E);
  
  // Gradient
  static const LinearGradient brandGradient = LinearGradient(
    colors: [gradientStart, gradientEnd],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );
}
```

## Tailwind Config (for dashboard)
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
    rating: '#FFB800',
  },
}
```
