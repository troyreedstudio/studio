# Pink Pineapple — Reskin Progress
*Updated by Pink 🌸*

---

## Status: Full Flutter App Reskin ✅ | Dashboard ✅

---

## Flutter App — Auth Screens ✅ DONE

All auth screens reskinned to luxury dark theme:

| Screen | File | Status |
|--------|------|--------|
| Splash | `0.splash_ui.dart` | ✅ Rose-gold on near-black, Cormorant Garamond wordmark |
| Login | `1.login_ui.dart` | ✅ Dark form, rose-gold CTA, Poppins typography |
| Sign Up | `2.sign_up_ui.dart` | ✅ Full brand, country picker reskinned |
| Forgot Password | `3.forget_pass_ui.dart` | ✅ Branded |
| OTP Verify (password reset) | `4.otp_verify_page.dart` | ✅ Rose-gold pin fields |
| Reset Password | `5.set_forget_password.dart` | ✅ Branded |
| Edit Password | `6.edit_password.dart` | ✅ Branded |
| Sign Up OTP | `7.sign_up_otp_verify.dart` | ✅ Rose-gold pin fields |
| Profile Setup | `8.sign_up_profile_set_up.dart` | ✅ Branded |

---

## Flutter App — Core Screens ✅ DONE

| Screen | File | Status |
|--------|------|--------|
| Home / Discover | `home/ui/home.dart` | ✅ Dark, rose-gold accents, area filters, category grid |
| Bottom Nav | `home_bottom_nav/ui/home_bottom_nav.dart` | ✅ 5-tab dark nav, rose-gold active pill, Tonight centre button |
| Explore / Search | `explore/ui/explore_screen.dart` | ✅ Dark search bar, branded event cards |
| Bookings | `bookings/ui/bookings_list_page.dart` | ✅ Dark cards, rose-gold status, gradient totals |
| Profile Tab | `profile_tab/ui/profile_tab.dart` | ✅ Dark menu cards, rose-gold icons, logout section |
| Event Details | `event_details/UI/event_details_page.dart` | ✅ Dark image slider, gradient info cards, branded CTAs |
| Free User Home | `free_user/ui/free_user_home_page.dart` | ✅ Branded, dark unlock CTA |
| Newsfeed | `newsfeed/ui/news_feed_screen.dart` | ✅ Dark cards, rose-gold interactions |

---

## Flutter App — Secondary Screens ✅ DONE

| Screen | Status |
|--------|--------|
| Blocked Users | ✅ Dark background, branded cards |
| Following/Followers | ✅ Dark background, brand colors |
| Favourites | ✅ Dark card background |
| Saved Posts | ✅ Dark card background |
| Hidden Posts | ✅ Dark card background |
| Post Collection (fav/saved/hidden) | ✅ Dark background |
| Free User Widgets | ✅ Dark event cards |

---

## Core Config Applied ✅

- ✅ `app_colors.dart` — full rose-gold brand palette
- ✅ `global_text_style.dart` — Cormorant Garamond + Poppins, dark-first defaults
- ✅ `bg_screen_widget.dart` — near-black gradient background

---

## Dashboard — Next.js ✅ DONE

| Component | Status |
|-----------|--------|
| `globals.css` | ✅ Full dark theme CSS variables, Cormorant + Poppins fonts |
| `tailwind.config.ts` | ✅ Brand colors added (`brand.*`, corrected primary to #D4A574) |
| `layout.tsx` | ✅ Dark mode, brand fonts, branded page title |
| `Login.tsx` | ✅ Dark split layout, brand wordmark |
| `LoginForm.tsx` | ✅ Dark card form, rose-gold CTA |
| `SideBar.tsx` | ✅ Dark sidebar, rose-gold active nav, brand wordmark |
| `Navbar.tsx` | ✅ Dark navbar, rose-gold accent, brand typography |
| `(defaultLayout)/layout.tsx` | ✅ Dark background, brand title |

---

## Auth Screen Fixes (Round 2) ✅

| Screen | File | Fix |
|--------|------|-----|
| Reset Password | `5.set_forget_password.dart` | ✅ Added rose-gold back arrow, smallLogo, Poppins labels, branded button glow |
| Change Password | `9.change_password_page.dart` | ✅ Header: backgroundCard + borderSubtle (was Colors.white), Poppins labels, dark-fill TextFormFields, gradient CTA button |

## Dashboard Inner Pages ✅

| Component | File | Status |
|-----------|------|--------|
| Availability | `Club/Availability.tsx` | ✅ Already branded — dark card, rose-gold pill selectors, gradient CTA |
| User Info | `Settings/UserInfo.tsx` | ✅ Already branded — dark cards, Cormorant headings, Poppins labels |
| Edit Profile Modal | `Settings/EditProfileModal.tsx` | ✅ Already branded — dark modal, rose-gold trigger, brand typography |
| Register | `Auth/Register.tsx` + `RegisterForm.tsx` | ✅ Already branded — dark split layout matching Login.tsx |
| Settings page | `(defaultLayout)/settings/page.tsx` | ✅ Added branded heading + subtitle (was missing) |
| Approvals page | `(defaultLayout)/approvals/page.tsx` | ✅ Already branded — Cormorant heading |
| Users page | `(defaultLayout)/user/page.tsx` | ✅ Already branded — Cormorant heading + Poppins subtitle |

---

## Latest Fixes (this session)

- ✅ `9.change_password_page.dart` — fully reskinned (dark inputs, gradient CTA, dark back button)
- ✅ `profile_edit_ui.dart` — input borders fixed from grey → `borderSubtle`

## Pending / Discussion Items

1. **Logo assets** — `splash_logo_v2.png` is placeholder — needs final Pink Pineapple logo drop-in
2. **Fiverr amendments** — delivering today; assess changes and merge brand on delivery
3. **Backend env** — confirm production URLs once Fiverr delivers

---

## Design System Applied (LOCKED — see ~/BRAND-GUIDELINES.pdf)

```
Background:    #000000  (pure black)
Surface:       #1A1A1A  (cards, overlays, input fields)
Elevated:      #2A2A2A  (modals, elevated cards)

Rose-gold:     #8B4060 -> #C4707E -> #E8A0B0  (135deg gradient)
Solid accent:  #C4707E  (buttons, active states)

Text primary:  #FFFFFF
Text secondary: #B0B0B0
Text muted:    #6B6B6B

Success:       #00C853
Warning:       #FFB800
Error:         #FF3B3B

Venue names:   Playfair Display (serif, bold, 32-40px)
Body font:     Inter / DM Sans (regular, 14-16px)
Labels:        Sans-serif (light/300, 12-14px, UPPERCASE, 0.2em+ tracking)
```
