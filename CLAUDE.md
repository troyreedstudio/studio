# Studio

Multi-project creative and development studio. We take ideas from initial research all the way through to deployed products — covering research, ideation, brand, content, app development, website building, and deployment.

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
    agape/            # Brand/content project
      assets/         # Logos, brand imagery, audio
    ideas/            # General ideas and research
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

### Agape

Brand and content project. Agape26 — visual identity, content calendar, and creative assets in development.

- **Phase**: Brand development — logos, content calendar, social posts, and audio content created
- **Assets**: Multiple logo iterations, Bondi post series, avatar concepts, opening script audio

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
