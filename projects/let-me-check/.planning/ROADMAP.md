### Phase 3: Video Pipeline
**Goal**: Replace the simulated camera with real in-app capture and a resilient pipeline that produces a genuine, audio-free clip the Seeker can actually watch.
**Depends on**: Phase 2 (can run in parallel with Phase 4)
**Requirements**: VID-01, VID-02, VID-03, VID-04
**Success Criteria** (what must be TRUE):
  1. A Scout films a live 15-second clip in-app; importing from the camera roll is blocked (fresh-capture enforced)
  2. Clips are video-only — audio is never recorded (sidesteps all-party-consent exposure)
  3. An upload survives a weak/dropped mobile network (resumable, retried, persisted locally first) and the job is not marked done until the server confirms receipt
  4. The Seeker watches a real transcoded clip streamed smoothly from CDN (Mux), with playback scoped to the buying Seeker
**Plans**: 5 plans (4 waves)
- [ ] 03-01-PLAN.md — SQL spine + Wave-0 scaffolds: 0010 Mux columns + new edges + delivered-needs-ready guard + service-actor; pgTAP + failing Vitest/Deno scaffolds
- [ ] 03-02-PLAN.md — The 3 Edge Functions: mux-upload-url, mux-webhook (sig-verified, idempotent, owns delivered), mux-playback-token (Deno tests)
- [ ] 03-03-PLAN.md — Client lib/clips.ts (resumable retried upload, playback token, no client-delivered) + vision-camera config (audio off) + invariants gate
- [ ] 03-04-PLAN.md — [BLOCKING] live deploy: db push 0010 + functions deploy + Mux account/secrets/webhook + types regen + fresh EAS dev build
- [ ] 03-05-PLAN.md — Wire filming.tsx (real camera) + delivery.tsx (signed Mux player) + on-device end-to-end walk-through
**UI hint**: yes
