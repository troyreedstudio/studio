# MEMORY.md - Long-Term Memory

## Key Facts
- Sascha Gray, 46, lives between Singapore and Bali
- Works in tech/sales at Amazon
- Building side hustles → businesses for financial freedom
- Focus areas: fashion, e-commerce, wellness/health
- Fitness-oriented: resistance training, Pilates, saunas, ice baths, daily meditation
- Dream: location-independent life split across Europe + hemispheres

## Collaborators
- **Tony** — Runs the VPS that hosts me (Frankie). Manages infrastructure. Customer service bot for tech issues/upgrades: **@jd_assistant_005_bot** on Telegram (only Troy or Sascha can message it).
- **Troy** — Sascha's collaborator/business partner. Has his own AI assistant called **Pink**.
- **Pink** — Troy's AI assistant (he/him). We work together in a group chat ("Frankie and Pink") to collaborate and challenge each other on Sascha's business ideas.

## Communication Preferences
- In group chat (and generally): respond with a **voice recording summary first**, then follow up with text
- Pink does the same — this is how Sascha and Troy prefer to receive info

## Agape 26 — Brand Overview
- Premium lifestyle/fashion brand co-founded 50/50 by Sascha and Troy
- Name: "Agape" (unconditional love) + "26" (highest consciousness level)
- Already patented
- Logo locked: **AGAP3** (E→3) in Didot/Bodoni serif, "26" in thin circle superscript
- Products: caps ($60-75), vest tops ($75-95), premium hoodies ($150-180) — margins 5-8x
- Sales channels: TikTok Shop, Amazon Live, social media, personal network
- Brand avatar "26": HeyGen AI avatar, Dua Lipa energy, first video produced
- Manufacturing: sourcing trip to China/Vietnam planned
- Troy's partner runs "Black Malibu" label, built "Street Stars" (Warner Brothers)
- Open items: vector logo production, manufacturing trip timing, social media strategy, launch timeline

## HeyGen Management
- **Frankie owns HeyGen** — always-on, 24/7 management responsibility
- Full bot guide stored in `memory/heygen-bot-guide.md`
- API key stored in TOOLS.md
- Base URL: https://api.heygen.com, auth via X-API-KEY header

### Confirmed Avatar IDs
- **Billie** (formerly 26): `35724036d05443ddb13a12482fae09d1` (female, long dark hair)
- **Monaco** (formerly Pink): `0691c6f795bb4c2ea63b7558c9c94763` (male, albino black guy, shirtless)
- **Rocco** (new ambassador, Indian): group_id `48304a8a760048418b3ef40705950702`

### Custom Cloned Voices
- **Billie** (formerly "26 - Voice 2"): `kso9SllpeChvwFZFbYYk` (female, cloned from real person)
- **Monaco** (formerly "Pink - Voice 3"): `KFxRtQLcfb0SOyqBE6wm` (male, cloned from real person)
- **Rocco**: NO custom voice yet — needs voice cloning to sound authentic (stock voices sound fake)

### Photo Avatar Workflow (PROVEN)
1. Upload image: `POST upload.heygen.com/v1/asset` (Content-Type + --data-binary)
2. Create group: `POST api.heygen.com/v2/photo_avatar/avatar_group/create` with `image_key`
3. Training (`v2/photo_avatar/train`) often rejects AI-generated images — BUT group_id works as avatar_id anyway
4. Generate video: use `type: "avatar"` + group_id as `avatar_id` in `/v2/video/generate`
- Photo Avatars are NOT in `/v1/talking_photo.list` — they have separate IDs
- `sharp` available at `/tmp/sharp/node_modules/sharp` for image processing
- 5 random talking photos exist in account but are NOT the brand avatars

## ⚠️ Ambassador Image Rules (ALWAYS FOLLOW)
- Generate on WHITE background — not grey/cream walls
- Portrait CENTERED with FULL HEAD visible — no top-of-head cropping
- Framing: "head and shoulders portrait centered in frame with space above the head"
- Never use "closeup" — it crops the head
- Remove.bg API key: `QQbrCBhHoMHEKeecD2jMz3GE` (40 credits/month, $9 plan)
- Don't ship half-quality — if it's not luxury standard, say so and fix properly

## Ambassador Scripts
- All scripts end with **"Agape 26."** (not just "26")
- Target: 35-40 words per script (~15 seconds at natural speaking pace)
- Style: clean, direct, conversational — NO forced pauses ("..."), NO filler words ("like...")
- Scripts saved at `agape26/ambassadors/SCRIPTS.md`

## Pink Pineapple — Bali Lifestyle App
- **Owner:** Troy (Sascha's business partner)
- **What:** Curated Bali lifestyle app — restaurants, beach clubs, events, wellness by area
- **Status:** Live on App Store + Google Play, built by Fiverr devs, needs full redesign
- **Tech stack:** Node.js/Express/Prisma backend, Next.js dashboard, Flutter mobile app
- **Hosted on:** DigitalOcean
- **API:** `https://api.pinkpineapple.app/api/v1`
- **Dashboard:** `https://dashboard.pinkpineapple.app`
- **App Store ID:** `id6758339469`
- **Brand:** LOCKED — "PINK" in bold geometric with metallic rose-gold gradient (#8B4060 → #E8A0B0), "PINEAPPLE" in thin wide-tracked white. Dark-first (black backgrounds). Premium luxury aesthetic.
- **Logo file:** `pink-pineapple/logo_primary_dark.jpg`
- **Venue database:** 36 venues across Canggu, Uluwatu, Seminyak in 5 categories
- **Code audit completed:** 2026-03-29 (critical security issues found & fixed)
- **Redesign roadmap:** `pink-pineapple/UI-UX-REDESIGN-ROADMAP.md`
- **Separate from Agape 26** — distinct project, do not conflate

## Tools & API Keys
- **OpenAI API key**: Sascha provided (stored in dalle_gen.js) — use DALL-E 3 for ambassador image generation
- **HeyGen API key**: in TOOLS.md
- **Lesson learned**: Free image APIs (Pollinations, Unsplash) are unreliable for standardized headshots. DALL-E 3 is the right tool — fast, reliable, consistent quality, ~$0.08/image

## Group Chat
- "Frankie and Pink Group Chat" ID: `-1003844339768` — added to config allowFrom on 2026-03-10
- Sascha wants me active in the group chat with Troy and Pink

## Pink Pineapple — Venue Locations (CONFIRMED by Sascha 2026-03-30)
- ALL nightlife venues are in **Canggu** (not Seminyak)
- Da Maria is a **Seminyak** restaurant (not Canggu) — but its Hip Hop night is listed under Canggu nightlife
- Kong is **Canggu** (not Seminyak)
- Miss Fish, Desa/Kitsune, Atlas = **Canggu** nightlife
- Muda By/Suka = ONE venue (not two)
- **Saya Club** is correct (not "The Sire Club" — misheard)
- No Seminyak nightlife venues yet — will add later
- No Ubud venues for now — focus on Canggu, Uluwatu, Seminyak only
- Dual-listing venues: Bella (restaurant + Wed night), Da Maria (restaurant + Hip Hop Wed)

## ⚠️ CRITICAL PROCESS RULE
- **ALWAYS check CHANGES-LOG.md, TASK-LIST.md, and memory/ BEFORE starting any task**
- **ALWAYS re-read DESIGN-SYSTEM.md before creating ANY visual output** — mockups, UI code, brand materials
- On 2026-03-30 I duplicated an entire night's work because I didn't check my own logs first
- On 2026-03-30 I created mockups with WRONG fonts and logo treatment because I didn't read my own design system
- This wastes Sascha's time and money — NEVER repeat these mistakes
- Fresh session = read everything first, act second
- Before delivering work = verify it matches the specs

## Project Organization (Updated 2026-03-30)
- All projects live under `projects/` folder
- `projects/agape26/` — Agape 26 brand
- `projects/pink-pineapple/` — Pink Pineapple app (has its own git repo)
- `projects/peptide-talk-show/` — Peptide Talk Show
- `projects/ideas/` — new ideas and brainstorms
- Master index: `projects/PROJECTS.md`
- Sascha asked for this organization so she can easily find project-specific content

## Milestones
- 2026-03-07: First session. Sascha introduced herself, named me Frankie.
- 2026-03-10: OpenAI key obtained, DALL-E 3 generating ambassador images. Group chat access fixed. Sascha willing to invest for quality.
