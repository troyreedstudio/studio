# Agape 26 Website — agape26.com

Captured from the live site on 2026-04-10. Originally built by Frankie on the OpenClaw VPS.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Homepage — hero image, brand intro, editorial grid, manifesto excerpt, category teasers (Collection, Home/Lifestyle), five pillars, footer |
| `story.html` | Brand story — full manifesto, five pillars, founders note |
| `collection.html` | Collection — "Coming Soon" with email capture |
| `home.html` | Home/Lifestyle — product imagery, "Coming Soon" with email capture |
| `gallery.html` | Editorial photo gallery with lightbox |

## Navigation

Story | Collection | Gallery | Home / Lifestyle | Contact

## Assets

### CSS
- `css/style.css` — single stylesheet, all pages

### JavaScript
- `js/main.js` — nav scroll behaviour, lightbox, interactions

### Images (18 files)
**Logos:**
- `images/logo_white.svg` — white AGAPE wordmark (for dark backgrounds/hero)
- `images/logo_black.svg` — black AGAPE wordmark (for light backgrounds)
- `images/logo_stack_white.svg` — stacked AGAPE 26 logo (white, for footer)
- `images/logo_ghost_light.png` — ghost watermark for light sections (CSS background)
- `images/logo_ghost_dark.png` — ghost watermark for dark sections (CSS background)

**Editorial photography (Sascha's shoots):**
- `images/hero_v6.jpg` — homepage hero (writing shot, desk, watch + pencil)
- `images/story_v7.jpg` — story page image
- `images/story_arch.jpg` — architectural shot
- `images/editorial_1.jpg`, `editorial_2.jpg`, `editorial_3.jpg` — gallery editorial shots
- `images/editorial_bath.jpg` — bath/wellness editorial
- `images/editorial_tub_bamboo.jpg` — bamboo tub editorial

**Product/category imagery:**
- `images/collection_hero_v2.jpg` — collection page hero (Sascha in robe, Cartier watch)
- `images/home_towel_v2.jpg` — rolled towels with AGAPE embroidery
- `images/home_bed.jpg`, `home_1.jpg`, `home_4.jpg` — home/lifestyle imagery

### Fonts
- **Montserrat** (Google Fonts, loaded via CSS `@import`) — weights: 300-700, italic 300-500
- Note: CSS variables `--serif` and `--sans` both resolve to Montserrat currently

## Design Direction

- **Aesthetic**: The Row — editorial photography, story-first, quiet luxury
- **Background**: Off-white/cream (`#F8F5F0`)
- **Typography**: Montserrat throughout
- **Nav**: Fixed, transparent over hero, frosted glass on scroll. Logo swaps white→black past hero on homepage.
- **Domain**: agape26.com (GoDaddy, 3-year registration)
- **CDN**: Cloudflare

## Status

- Collection and Home/Lifestyle pages show "Coming Soon" with email capture
- Gallery is the primary content hub until product inventory exists
- No e-commerce integration yet (Shopify planned)
