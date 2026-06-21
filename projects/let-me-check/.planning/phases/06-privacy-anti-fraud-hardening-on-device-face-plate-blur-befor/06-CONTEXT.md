# Phase 6: Privacy + Anti-Fraud Hardening - Context

**Gathered:** 2026-06-22 (authored autonomously by Guy — Troy offline; ALL decisions below are DEFAULTS chosen on his behalf and MUST be reviewed in the morning. See "DECISIONS TO CONFIRM" at the end.)
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the verification moat tamper-resistant and legally safe for filming in public:
1. **Privacy blur** — blur faces (and best-effort license plates) so we never deliver/keep identifiable bystanders.
2. **Anti-fraud / location-spoofing detection** — detect a Scout faking their GPS so the Phase-5 geofence can't be gamed.
3. **On-device AI groundwork** — where feasible, run detection/blur on-device so raw unblurred footage never leaves the phone.

In scope: a privacy-blur pipeline + a fraud-signal model (record + flag suspicious clips) + the data/edge plumbing. Out of scope: a full adversarial anti-spoof system, KYC/identity beyond what Stripe already does (Phase 4), Live feed / B2B (later waves).
</domain>

<decisions>
## Implementation Decisions (DEFAULTS — confirm in the morning)

### Privacy blur
- **D-01 (where blur runs):** Prefer **on-device, before upload** (privacy-by-default — raw unblurred footage never leaves the phone). BUT on-device frame-processor blur (vision-camera + CoreML/Vision) is the hardest, device-only thing to build and CANNOT be verified overnight. **DEFAULT FOR THE OVERNIGHT BUILD: design + scaffold the on-device path AND build a verifiable server-side blur fallback (post-upload, before delivery) so privacy is guaranteed even if on-device isn't ready. Research decides which is actually feasible.** ⚠️ CONFIRM: on-device vs server-side blur for v1.
- **D-02 (what gets blurred):** Faces = always. License plates = best-effort. (DEFAULT.)
- **D-03 (blur-failure handling):** **Privacy-safe default: if blur cannot be applied/confirmed, the clip is NOT delivered — it's held + flagged for review** (better to delay a clip than deliver an unblurred bystander's face). ⚠️ CONFIRM: hold-on-blur-failure vs deliver-anyway-and-flag.

### Anti-fraud / location-spoofing
- **D-04 (detection, not hard-block at launch):** Detect what iOS realistically allows — jailbreak/compromised device, simulator, impossible location jumps ("teleport"), GPS/accuracy anomalies. **Record a fraud_signal on the clip/check and FLAG suspicious ones for review. DEFAULT: do NOT auto-reject on a spoof signal at launch (false-positive risk) — flag + review; make the strictness tunable.** ⚠️ CONFIRM: flag-only vs auto-reject on spoof.
- **D-05 (scope):** This phase adds DETECTION + signals + flagging, layered on the existing GPS fence (Phase 5). It is not a guaranteed anti-spoof (iOS can't fully detect simulated location on a non-jailbroken device) — it raises the cost of cheating + surfaces it for review.

### On-device AI
- **D-06 (signage stays server-side):** Signage AI already works server-side (Google Vision, Phase 5). DEFAULT: keep it there; Phase 6 focuses on blur + spoof-detection. On-device signage = deferred. ⚠️ CONFIRM ok.

### Privacy posture
- **D-07:** Privacy-by-default — the product's promise (per docs/FILMING-POLICY + SCOUT-CONDUCT) is that faces are blurred before delivery. Whatever path (D-01), no clip is DELIVERED with unblurred faces.

### Claude's Discretion
- Blur radius/strength, detection thresholds, the specific Vision/CoreML model, the fraud_signal schema shape, event-log additions. Tunable via config (market-aware, like Phase 5 radii).
</decisions>

<canonical_refs>
## Canonical References

- `docs/FILMING-POLICY.md` + `docs/SCOUT-CONDUCT.md` — the face-blur promise ("blur applied before upload; if blur fails, soft-flag for review"; "iOS Vision API on device"). NOTE: D-03 default here is stricter (hold, don't deliver) — confirm against these docs.
- `docs/STACK.md` — "Live face/scene blur (privacy): vision-camera frame processors + on-device CoreML"; anti-fraud notes.
- `.planning/PROJECT.md` — verification stack, market-aware config, deferred-to-Phase-6 notes (mock-location detection).
- `.planning/phases/05-*/05-CONTEXT.md` + `05-RESEARCH.md` — the GPS fence + verify-clip gate this hardens; reuse the market_config tunable pattern + distance_m.
- `lmc-app/app/(scout)/filming.tsx` — vision-camera capture (where on-device blur/frame-processor + spoof-signal capture would hook in).
- `supabase/functions/verify-clip/index.ts` + `mux-webhook/index.ts` — where a server-side blur step / fraud-signal evaluation would slot before delivery.
- `supabase/migrations/0012*/0013*` — geo/market_config pattern to extend for blur/fraud config + signals.
</canonical_refs>

<code_context>
## Existing Code Insights
- vision-camera 4.7.x is installed (frame processors available, but New Arch + frame-processor + a worklet/CoreML model is the hard, device-only path).
- Mux is the video host — a server-side blur would likely need processing the asset (Mux doesn't blur; would need a transcode/ML step) — research must assess; on-device is cleaner if feasible.
- market_config (Phase 5) is the tunable-config home; add blur/fraud thresholds there.
- verify-clip already gates BEFORE delivered — a fraud/blur check can slot into the same gate.
- New Architecture is ON (Mapbox requires it) — any native module/frame-processor must be New-Arch compatible (this bit us in Phase 5: createUploadTask, google-signin).
</code_context>

<specifics>
## Specific Ideas
- Reuse the Phase-5 pattern: tunable config in market_config + a server-side gate in verify-clip/mux-webhook + event-log every signal.
- Privacy-by-default is the north star: never deliver an unblurred face.
- Anti-spoof = raise the cost + surface for review, not a guarantee.
</specifics>

<deferred>
## Deferred Ideas
- Full adversarial anti-spoof / guaranteed mock-GPS prevention (iOS-limited).
- On-device signage AI (server-side works).
- Scene/background blur beyond faces+plates.
- Live feed, B2B API, second city (later waves).
</deferred>

## ⚠️ DECISIONS TO CONFIRM IN THE MORNING (Troy)
1. **On-device vs server-side blur** (D-01) — research will say what's feasible; I'll build the safest buildable path and flag.
2. **Blur-failure handling** (D-03) — hold-clip (privacy-safe, my default) vs deliver-and-flag (matches current docs).
3. **Spoof handling** (D-04) — flag-only (my default) vs auto-reject.
4. **Signage stays server-side** (D-06) — confirm fine.

---

*Phase: 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor*
*Context authored autonomously 2026-06-22 — defaults pending Troy's review*
