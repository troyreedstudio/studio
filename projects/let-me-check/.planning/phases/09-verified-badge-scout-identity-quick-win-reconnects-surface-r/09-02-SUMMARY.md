---
phase: 09-verified-badge-scout-identity-quick-win-reconnects-surface-r
plan: "02"
subsystem: frontend
tags: [delivery, scout-identity, verified-badge, rpc, fake-content-removal]
dependency_graph:
  requires:
    - 09-01 (get_check_scout_public RPC in migration 0017)
    - clips.gps_verified column (migration 0012, Phase 5)
  provides:
    - delivery.tsx: real verified badge gated on clip.gps_verified === true
    - delivery.tsx: real scout identity via get_check_scout_public RPC
    - delivery.tsx: fake AI Verdict + Crowd Report fully removed
  affects:
    - 09-04 (live DB push will make RPC available; on-device confirmation deferred there)
tech_stack:
  added: []
  patterns:
    - (supabase as any).rpc untyped cast for RPCs not yet in database.types.ts (mirrors checks.ts line 68)
    - Graceful null handling — fallback display values, hidden UI rows when data unavailable
key_files:
  created: []
  modified:
    - lmc-app/app/(seeker)/delivery.tsx
decisions:
  - "Badge is strictly clip.gps_verified === true — null (not checked) and false (failed) both render nothing, per D-01"
  - "scoutMeta rating line hidden entirely when both avg_rating and clip_count are null (fresh Scout) — no phantom star row"
  - "Untyped cast (supabase as any).rpc mirrors checks.ts SAFE-01 pattern; type regen deferred to Plan 09-04"
  - "TAGS const + AI Verdict block + CROWD REPORT block deleted in Task 1 before wiring real data in Task 2 (clean separation)"
metrics:
  duration: "5m"
  completed_date: "2026-06-22"
  tasks_completed: 2
  files_created: 0
  files_modified: 1
---

# Phase 9 Plan 02: Delivery Screen — Real Badge + Real Scout Identity Summary

Real `gps_verified`-gated Verified badge, RPC-driven Scout identity card, and full removal of the fabricated AI Verdict + Crowd Report blocks from `delivery.tsx`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove fake AI Verdict + Crowd Report (D-03) | 639e817 | lmc-app/app/(seeker)/delivery.tsx |
| 2 | Real Verified badge (D-01) + real Scout identity via RPC (D-02) | f333f32 | lmc-app/app/(seeker)/delivery.tsx |

## What Was Built

### Task 1 — Fake content removed (D-03)

Deleted from `delivery.tsx`:
- Top-level `const TAGS = ['Busy Tonight', 'Short Line', 'Worth It']`
- `<View style={styles.aiVerdictRow}>` JSX block (the ✦ AI VERDICT badge + "Short line · ~30 inside · medium energy" text)
- `<Text style={styles.sectionLabel}>CROWD REPORT</Text>` line and the immediately following `<View style={styles.tagRow}>{TAGS.map(...)}</View>`
- Seven orphaned StyleSheet keys: `aiVerdictRow`, `aiBadge`, `aiBadgeText`, `aiVerdictText`, `tagRow`, `tag`, `tagText`

`styles.sectionLabel` was preserved — it remains the sole definition and is still referenced by the "RATE YOUR CHECK" label at line 188.

### Task 2 — Real data wired (D-01, D-02)

**Import:** Added `import { supabase } from '../lib/supabase'` (was not previously imported in this file).

**State:** `scoutProfile` state typed as `{ display_name: string | null; avg_rating: number | null; clip_count: number | null } | null`.

**RPC fetch:** New `useEffect` keyed on `[checkId]` calls `(supabase as any).rpc('get_check_scout_public', { p_check_id: checkId })`, reads `data?.[0]`, and sets state. Errors are swallowed with `.catch(() => {})` so a not-yet-delivered check or RPC error never crashes the screen.

**Derived display values:**
- `scoutName` — `display_name ?? 'Your Scout'`
- `scoutInitial` — first character of `display_name`, uppercased; falls back to `'S'`
- `ratingPart` — `⭐ {avg_rating}` or `null` if no rating yet
- `clipsPart` — `{clip_count} videos` or `null` if no clips yet
- `scoutMeta` — joined with ` · `, empty string when both parts are null

**Scout card JSX:**
- Avatar text: `{scoutInitial}` (was hardcoded `'J'`)
- Name: `{scoutName}` (was hardcoded `'Jake C.'`)
- Rating line: `{scoutMeta ? <Text style={styles.scoutRating}>{scoutMeta}</Text> : null}` (hidden entirely for a fresh Scout with no data)
- Verified badge: `{clip?.gps_verified === true && (<View ...>✓ Verified</View>)}` (was always rendered)

File is 284 lines — well within the 500-line limit.

## Decisions Made

1. **`=== true` strict equality for badge.** `clip?.gps_verified` is `boolean | null`. Using `=== true` means `null` (not yet verified) and `false` (failed GPS check) both correctly suppress the badge. A truthy check (`if (clip?.gps_verified)`) would also suppress null but the explicit `=== true` makes the intent unambiguous.

2. **`scoutMeta` line hidden when empty.** Rather than rendering an empty `<Text>`, the rating/clips row is conditionally `null` when `scoutMeta` is an empty string. This avoids visual gaps for a brand-new Scout with zero delivered clips.

3. **Untyped cast mirrors existing pattern.** `(supabase as any).rpc(...)` matches the `is_in_no_film_zone` call at `checks.ts` line 68. Type regeneration happens in Plan 09-04 after the live DB push.

4. **Task 1 before Task 2.** Removing the fake content first kept the diff focused and let the tsc check confirm no orphaned style references before adding new state.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The RPC call is real (pointing at the function defined in migration 0017). The data it returns depends on the live DB push in Plan 09-04. Until that push, the RPC will return an error (caught silently) and the screen gracefully shows "Your Scout" with no meta line — the correct neutral fallback.

## Threat Flags

None. All three threat-model items from the plan are fully mitigated:
- T-09-06 (false trust signal): badge strictly gated on server-owned `clip.gps_verified === true`
- T-09-07 (scout IDOR): client only renders what the server-enforced RPC returns; fallback to "Your Scout" on any error
- T-09-08 (fabricated AI feature): AI Verdict + Crowd Report blocks deleted entirely

## Self-Check: PASSED

- `lmc-app/app/(seeker)/delivery.tsx` confirmed at 284 lines
- Commit `639e817` (Task 1) and `f333f32` (Task 2) confirmed in `git log`
- All Task 1 grep assertions passed: no AI VERDICT, CROWD REPORT, TAGS, aiVerdictRow, tagRow; sectionLabel + RATE YOUR CHECK present
- All Task 2 grep assertions passed: get_check_scout_public present, gps_verified === true present, no Jake C, no 247 videos, scoutProfile present
- `npx tsc --noEmit` clean after both tasks
