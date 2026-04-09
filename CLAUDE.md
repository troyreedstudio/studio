# Studio

Multi-project creative and development studio. We take ideas from initial research all the way through to deployed products — covering research, ideation, brand, content, app development, website building, and deployment.

## People & Agents

This studio is run by two humans and has been shaped by two AI agents:

### Humans

- **Troy Reed** — co-founder of Agape 26, production/content background, runs Black Malibu clothing label, created Street Stars documentary (Warner Brothers). Based in Bali/Singapore with Sascha.
- **Sascha Gray** — co-founder of Agape 26, works in technology and sales at Amazon. Lives between Singapore and Bali. Fashion, wellness, e-commerce. Goal: side hustles to passive income to financial freedom.

### Agents

- **Troy (Claude Code)** — runs locally on Troy's MacBook Air via Claude Code CLI. This is the current active agent for the studio. Handles development, architecture, and project management.
- **Frankie** (she/her, ⚡) — Sascha's dedicated AI assistant. Ran on a VPS via OpenClaw (always-on, 24/7). Sharp, direct, resourceful strategist. Did the heavy lifting on Pink Pineapple (full code audit, security fixes, venue API, Flutter + dashboard rebrand, brand guidelines, design system), Agape 26 (brand manifesto, ambassador program, HeyGen avatars, content calendar), and Peptide Talk Show (story bible, character design, episode scripts).
- **Pink** (he/him, 🌸) — Troy's AI assistant, also on OpenClaw. Ran on Troy's MacBook. Handled the Pink Pineapple Flutter UI reskin and collaborated with Frankie in a shared group chat.

Both agents collaborated on the same projects via a "Frankie and Pink Group Chat" on Telegram alongside Troy and Sascha. The `docs/` folder preserves their original workspace files (FRANKIE-IDENTITY.md, FRANKIE-SOUL.md, FRANKIE-MEMORY.md, FRANKIE-PROJECTS.md, AGENTS.md, TOOLS.md, USER.md, etc.) for reference and continuity. This studio repo consolidates all prior work into one place.

## Studio Structure

```
studio/
  projects/           # Project source code and assets
    let-me-check/     # On-demand nightlife venue video verification app
      lmc-app/        # React Native + Expo app
      docs/           # Business plan, pitch decks
      *.png/mp4/mp3   # Logos, screenshots, trailer
    pink-pineapple/   # Premium Bali lifestyle & booking app
      app/            # Flutter app (legacy — to be rebuilt in React Native)
      backend/        # Node.js + Prisma + MongoDB API
      dashboard/      # Next.js admin dashboard
      assets/         # Character art, voice files, style explorations
    agape/            # Premium lifestyle brand
      assets/         # Logos, brand imagery, avatar videos, audio
      ambassadors/    # Global Citizens ambassador images + scripts
    ideas/            # General ideas, research, and incubating projects
      peptide-talk-show/  # AI debate show (Pep & Tide) — story bible, scripts
  skills/             # Per-project Claude Code skills
    let-me-check/     # LMC skill (brand, stack, phase, goals)
    pink-pineapple/   # Pink Pineapple skill
    agape/            # Agape skill
    ideas/            # Ideas & research skill
  docs/               # Studio-wide identity, tools, and reference docs
```

## Projects

### Let Me Check (LMC)

On-demand nightlife venue video verification app. Users pay $15-20 for a 60-second video of a venue filmed by a "Checker" (independent videographer), delivered within 7-15 minutes. Two user roles: Users (browse, request, pay, watch) and Checkers (accept, film, earn).

- **Tech stack**: React Native 0.83.2 + Expo 54 + TypeScript 5.9, Expo Router (file-based routing)
- **Phase**: MVP/prototype complete — fully functional UI flows with mock data, no backend yet
- **Next**: Backend integration (auth, payments, real-time, camera, geolocation)

### Pink Pineapple

Premium Bali lifestyle guide and booking app. Think Monocle meets Time Out — curated discovery of clubs, restaurants, bars, beach clubs, and gyms with instant booking. Area-based (Canggu, Uluwatu, Seminyak).

- **Tech stack**: Legacy Flutter app (to be rebuilt in React Native + Expo), Node.js + Prisma + MongoDB backend, Next.js + Tailwind admin dashboard
- **Phase**: Assessment complete — backend is solid (keep + extend), Flutter app to be rebuilt from scratch in React Native, dashboard gets a UI redesign
- **Design language**: Warm black (`#0A0A0A`), gold accent (`#F4C97A`), coral accent (`#E8A87C`) — tropical luxury aesthetic
- **Next**: Extend backend schema (areas, venue categories, gyms), build new React Native app, connect to existing API

### Agape 26

Premium lifestyle brand — 50/50 partnership between Sascha Gray and Troy Reed. Anchored in high consciousness and unconditional love. Product lineup: caps, vest tops, premium hoodies. Strong margins (5-8x on caps/singlets).

- **Logo**: AGAP3 wordmark (Didot/Bodoni serif, forward 3) + 26 in thin circle — concept locked
- **Phase**: Brand development — logo locked, content calendar written, avatar "26" live on HeyGen, Instagram @agape26collection launched, domain agape26.com purchased
- **Next**: Vector logo production, manufacturing sourcing (China/Vietnam), Shopify store, TikTok handle

### Ideas

General ideas and research folder for new concepts and explorations.

## Workflow Philosophy

Each project moves through phases:

1. **Research & Ideation** — problem space exploration, competitive analysis, concept validation
2. **Brand & Identity** — naming, visual identity, tone, target audience
3. **Design & Prototyping** — wireframes, UI mockups, user flows
4. **Development** — code, architecture, implementation
5. **Content & Marketing** — copy, assets, launch strategy
6. **Deployment & Operations** — hosting, CI/CD, monitoring, iteration

## Conventions

- Each project has its own skill in `skills/<project>/` with a `CLAUDE.md` covering brand, tech stack, current phase, and goals
- Project source code lives in `projects/<project>/`
- Keep project-specific details in the project's own `CLAUDE.md`, not here
- This global file covers studio-wide structure and cross-project concerns
