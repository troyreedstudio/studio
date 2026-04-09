# 🍍 Pink Pineapple Dashboard Rebrand — Action Plan

**Created:** 2026-03-29
**Updated:** 2026-03-29
**Owner:** Frankie
**Status:** Phase 1 & 2 COMPLETE, Phase 3 started

---

## Phase 1: Brand Foundation ✅ COMPLETE

### Done:
- ✅ Root layout metadata → "Pink Pineapple Admin"
- ✅ Default layout metadata → "Pink Pineapple Admin"
- ✅ All logo files replaced (src/assets + public/images)
- ✅ Tailwind config — all PP brand colors added
- ✅ CSS variables — full PP token set in globals.css
- ✅ Root CSS vars switched to dark-first (both :root and .dark)
- ✅ Sidebar CSS vars → dark theme
- ✅ Main layout background → black (bg-pp-bg)
- ✅ Font changed from Roboto → Inter (design system font)
- ✅ HTML tag has `class="dark"` for dark mode
- ✅ Body: `bg-pp-bg text-pp-text-primary`
- ✅ Toast notifications styled dark

---

## Phase 2: Layout & Navigation ✅ COMPLETE

### Done:
- ✅ **Sidebar** — fully rebranded:
  - Black background, dark border
  - Rose-gold gradient for active nav items
  - New nav structure: Dashboard, Venues, Events, Bookings, Users, Settings
  - Club owner nav: My Venue, Events, Messages, Settings
  - Logout button with rose-gold hover
- ✅ **Navbar** — fully rebranded:
  - Dark surface background with elevated border
  - Dynamic page title (pulls from current route)
  - Rose-gold accents
  - Mobile menu sheet → dark theme with gradient active states
  - User avatar with rose-gold ring
- ✅ **Button component** — new PP variants:
  - `pp-primary` — gradient fill, pill shape, shadow
  - `pp-secondary` — gradient outline, pill shape
  - `pp-ghost` — transparent with rose-gold text
  - All existing variants updated for dark theme
  - New `xl` size
- ✅ **MyBtn** — gradient fill, pill shape
- ✅ **Form inputs** — dark surface bg, rose focus ring, muted placeholders
- ✅ **Form labels** — secondary text, small/medium weight

---

## Phase 2.5: Auth Pages ✅ COMPLETE

### Done:
- ✅ **Login** — dark split layout, logo contained (not cover), gradient CTA
- ✅ **LoginForm** — dark card, rose-gold sign in button, styled links
- ✅ **Register** — dark split layout matching login
- ✅ **RegisterForm** — dark card, all buttons gradient, OTP slots styled
- ✅ **ForgotPassword** — dark layout
- ✅ **ForgotPasswordForm** — dark card, gradient CTA
- ✅ **ResetPassword** — dark layout
- ✅ **ResetPasswordForm** — dark card, gradient CTA
- ✅ **VerifyOtp** — dark layout

---

## Phase 3: New Pages — IN PROGRESS

### Done:
- ✅ **Dashboard home** — stats cards, venues by area chart, categories grid, quick actions
- ✅ **Venues page** — search, area/category filters, venue table with status badges
- ✅ **Events page** — wrapper with PP styling, status tabs in rose-gold
- ✅ **/events route** created (separate from home)

### Still needs:
- [ ] Venue create/edit form page
- [ ] Venue detail page
- [ ] Wire venues page to real API (currently static data)
- [ ] Bookings management page rebrand
- [ ] User management page rebrand
- [ ] Settings page rebrand

---

## Phase 4: Dashboard Analytics (Later)

- [ ] Real-time stats from API
- [ ] Charts (Recharts): bookings over time, venues by category/area
- [ ] Revenue tracking (when Stripe integrated)

---

## Files Changed (Complete List)

```
src/app/layout.tsx                              — Font, dark mode, toasts
src/app/globals.css                             — Dark-first CSS vars
src/app/(defaultLayout)/layout.tsx              — PP metadata
src/app/(defaultLayout)/page.tsx                — NEW dashboard home
src/app/(defaultLayout)/venues/page.tsx         — NEW venue management
src/app/(defaultLayout)/events/page.tsx         — NEW events route
src/components/shared/SideBar.tsx               — Full rebrand
src/components/shared/Navbar.tsx                — Full rebrand
src/components/ui/button.tsx                    — PP variants
src/components/common/MyBtn.tsx                 — Gradient style
src/components/form/MyFormInput.tsx             — Dark theme
src/components/modules/Auth/Login.tsx           — Dark layout
src/components/modules/Auth/LoginForm.tsx       — Dark card
src/components/modules/Auth/Register.tsx        — Dark layout
src/components/modules/Auth/RegisterForm.tsx    — Dark theme
src/components/modules/Auth/ForgotPassword.tsx  — Dark layout
src/components/modules/Auth/ForgotPasswordForm.tsx — Dark card
src/components/modules/Auth/ResetPassword.tsx   — Dark layout
src/components/modules/Auth/ResetPasswordForm.tsx — Dark card
src/components/modules/Auth/VerifyOtp.tsx       — Dark layout
src/components/modules/Events/Events.tsx        — Dark table
tailwind.config.ts                              — PP color tokens
```
