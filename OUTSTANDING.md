# Studio — Outstanding Tasks

Living list of outstanding work across all studio projects. Pulled from each project's skill `CLAUDE.md` and current phase notes. Update this file when tasks are completed or new ones appear.

Last updated: 2026-04-10

---

## Let Me Check (LMC)

Phase: MVP/prototype complete — fully functional UI with mock data. Ready for backend.

- [ ] Backend integration: auth (sign-up/login), Stripe payments, real-time notifications, camera capture, geolocation
- [ ] Build out Scout onboarding and verification flow
- [ ] Beta launch in one target city
- [ ] Add test / lint / build scripts to `lmc-app/` (none configured yet)
- [ ] **Privacy / Rules / Acceptable-Use policy** — must be presented and accepted at sign-up (added 2026-05-06):
  - No filming of people's personal image (no faces / individuals)
  - No filming in court rooms
  - No filming someone's home
  - No sharing of LMC imagery to social media (Instagram, TikTok, etc.)
  - Imagery is for personal recommendation and use only — not redistribution
  - Build out the full Rules + Privacy + Regulations section on top of these
  - Wire to sign-up acceptance flow (checkbox + ToS/Privacy link)
- [ ] **AI / ML backend layer** (post-design phase, added 2026-05-06) — currently mocked in the UI prototype, swap-in points marked in code:
  - **Real speech-to-text** — replace voice search mock (`VOICE_MOCKS` in `app/(seeker)/search.tsx`) with @react-native-voice/voice or expo-speech-recognition; tie to OpenAI Whisper or Google Speech for high-accuracy transcription
  - **Natural-language query parsing** — Anthropic Claude API (or similar LLM) parses queries like "busiest gym in Miami" or "quiet coffee shop in Brooklyn" into structured search params (category + city + filter). Powers the SMART_CHIPS_BY_KEYWORD inference and the conversational placeholder hints (rotating examples already shipped in UI)
  - **Google Places Autocomplete API** — replace `ALL_PLACES` mock array with live Google Places suggestions; respect API key + billing setup
  - **AI signage / venue verification on submitted clips** — auto-validate the Scout filmed the right place (logo/sign detection on clip, GPS geofence cross-check) — feeds into the verification stack moat
  - **Crowd-density estimation from video** — lightweight ML model on the clip estimates occupancy ("~30 people inside, ~70% capacity"); powers the AI VERDICT line on `app/(seeker)/delivery.tsx`
  - **AI clip auto-summary** — generate the 1-line verdict ("Short line · ~30 inside · medium energy") automatically from clip + metadata; currently hardcoded mock on delivery screen
  - **Real-time activity feed** — replace `LIVE_FEED` static array on home with live stream of recently-completed checks (websocket / SSE)
  - **Smart push notifications** — geofenced + time-aware ("Long lines at JFK Terminal 4 right now — check before you go?"); requires user location consent + ML for triggering rules
  - **Personalized "For You" feed** — TikTok-style algorithmic recommendations based on user's check history + popular nearby
  - **Voice agent (out-loud confirmation)** — conversational responses like "Sending a Scout to Komodo for $15 in 8 min — confirm?"; needs TTS + a small dialog manager

Code: `projects/let-me-check/lmc-app/` · Docs: `projects/let-me-check/docs/`

---

## Pink Pineapple

Phase: LIVE on App Store + Google Play. Backend, dashboard, Flutter app deployed. 38 venues seeded.

- [ ] Source real venue photography for all 38 venues (Sascha in Bali)
- [ ] Rotate all credentials flagged in `projects/pink-pineapple/docs/AUDIT-REPORT.md` (critical)
- [ ] Set up a proper Firebase project for push notifications
- [ ] Integrate Stripe for payments in the backend
- [ ] User acquisition and growth in the Bali market
- [ ] Iterate on the live product based on user feedback
- [ ] (Future) Rebuild Flutter app in React Native + Expo — browse-first, no social features

Live infra: `api.pinkpineapple.app` · `dashboard.pinkpineapple.app` · MongoDB on DigitalOcean

---

## Agape 26

Phase: Brand development — logo concept locked, content calendar written, Instagram live, avatar 26 on HeyGen.

- [ ] Vector logo production from a graphic designer (99designs / Fiverr Pro) — SVG/AI, PNG transparent, embroidery-ready
- [ ] Manufacturing sourcing trip to China or Vietnam (dates TBD)
- [ ] Shopify store setup
- [ ] Coming soon page on `agape26.com`
- [ ] Grab TikTok handle
- [ ] Execute Month 1 content calendar (16 posts, 4–5x/week)
- [ ] Rocco avatar voice cloning on HeyGen (group_id `48304a8a760048418b3ef40705950702`)
- [ ] Ambassador program — 20 scripts written, need remaining scripts + video production for Global Citizens rollout

Assets: `projects/agape/assets/` · Ambassadors: `projects/agape/ambassadors/`

---

## Ideas / Peptide Talk Show

Phase: Incubating — story bible, episode map, character catalog, Week 1 scripts exist. No hard deliverables committed.

- [ ] Decide whether to promote Peptide Talk Show out of `ideas/` into its own project
- [ ] If promoted: production pipeline (voice, animation, distribution)

---

## Studio-wide

- [ ] Review uncommitted LFS-tracked media changes in `projects/agape/assets/`, `projects/pink-pineapple/assets/`, `projects/let-me-check/` (see `git status`) — decide what to commit
- [ ] `.env.example` has uncommitted edits — decide final form and commit

---

## How this file is maintained

- Source of truth for the outstanding task list across the studio.
- Referenced from `~/.claude/projects/-Users-troyreed-studio/memory/` so future Claude Code sessions (terminal or Telegram) can find it.
- When a task ships, check it off or delete the line. When new work appears, add it under the right project.
