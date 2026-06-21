-- 0014_privacy_fraud_signals.sql
-- LMC Phase 6 — Privacy + Anti-Fraud Hardening: SQL spine
--
-- This migration lays ALL Phase-6 schema foundations in one place so Plans 02/03/04
-- build against fixed contracts (same discipline as 0012 used for Phase 5). It adds:
--   (1) clips additive columns   — blur_status, fraud_signals, fraud_flag, fraud_score
--                                  SERVICE-ROLE-ONLY writes (DATA-02). No new client
--                                  UPDATE policy is added for any of these columns.
--   (2) market_config columns    — blur_enabled (LAUNCH POSTURE: DEFAULT FALSE, gate
--                                  dormant until on-device blur visually confirmed, D-07)
--                                  + fraud_strictness (DEFAULT 'flag', tunable, D-04).
--   (3) check_status enum value  — 'blur_review' ADD VALUE BEFORE the function replace
--                                  (Pitfall 4: ::text comparison avoids create-time
--                                  enum-label resolution; ADD VALUE must precede the
--                                  CREATE OR REPLACE that references it).
--   (4) is_valid_check_transition() CREATE OR REPLACE — full 0012 body verbatim + the
--                                  three new blur_review edges. ENTRY edge is
--                                  filming -> blur_review (see comment at the edge
--                                  below). Exits are delivered / dispatching / cancelled.
--
-- ORDERING NOTE: runs AFTER 0013 (upsert_scout_location_rpc). Uses ::text comparison
-- in all function bodies. Section (3) ALTER TYPE ... ADD VALUE runs FIRST so the
-- CREATE OR REPLACE in section (4) never sees a missing enum label.
--
-- DATA-02 STILL HOLDS: no new client INSERT/UPDATE/DELETE policy on clips or
-- market_config beyond the existing read-only policy on market_config. All writes to
-- blur_status/fraud_flag/fraud_score are service-role-only (face-blur-check and
-- fraud-eval Edge Functions running under service role).

-- =============================================================================
-- 1. clips additive columns — blur + fraud verdicts
-- =============================================================================
-- All columns are nullable (do not affect existing rows or ongoing checks).
-- blur_status text vocabulary (stored as text, not a separate enum to allow
-- schema-free extension):
--   'pending'                    — initial value; face-blur-check not yet run
--   'no_faces'                   — Vision returned 0 faces; clip safe to deliver
--   'blurred'                    — on-device blur confirmed before upload (Plan 03)
--   'faces_detected_unblurred'   — Vision found face(s) AND blur is unconfirmed;
--                                  D-03: clip held in blur_review, NOT delivered
--   'blur_check_failed'          — Vision API error / missing playback id;
--                                  fail-open (like signage D-06): action='pass' with
--                                  no transition — only confirmed faces trigger hold
-- fraud_signals: raw signals jsonb captured client-side and stored server-side as
--   provenance. The fraud verdict (fraud_flag/fraud_score) is computed ONLY by the
--   fraud-eval Edge Function (service role) — client-supplied signals are NEVER trusted
--   as the verdict (T-06-02). Stored for audit and tuning.
-- fraud_flag, fraud_score: SERVICE-ROLE-ONLY writes. No client UPDATE policy.
--   fraud_score is smallint (0-100 range; NULL if fraud-eval has not run).
-- DATA-02 NOTE: No new client UPDATE policy is added here. blur_status/fraud_flag/
--   fraud_score are writable only by the service role via face-blur-check / fraud-eval.

alter table public.clips
  add column if not exists blur_status   text    default 'pending',
  add column if not exists fraud_signals jsonb,
  add column if not exists fraud_flag    boolean default false,
  add column if not exists fraud_score   smallint;

comment on column public.clips.blur_status is
  'Phase 6: blur verification state for this clip. Vocabulary (stored as text): '
  '''pending'' (initial) | ''no_faces'' | ''blurred'' | ''faces_detected_unblurred'' | ''blur_check_failed''. '
  'Written ONLY by the face-blur-check Edge Function (service role). '
  'No client UPDATE policy (DATA-02 / T-06-01). '
  'D-03: ''faces_detected_unblurred'' holds the check in blur_review; '
  '''blur_check_failed'' is fail-open — only confirmed faces trigger a hold.';

comment on column public.clips.fraud_signals is
  'Phase 6: raw fraud detection signals captured client-side (FraudSignals JSON). '
  'Stored as provenance for audit and model tuning. '
  'The verdict is computed server-side by fraud-eval — client signals are NOT trusted as '
  'the verdict (T-06-02). No client UPDATE policy (DATA-02).';

comment on column public.clips.fraud_flag is
  'Phase 6: true if fraud-eval determined the clip/check is suspicious. '
  'D-04: flag-only at launch (strictness=''flag''); auto-reject is tunable via '
  'market_config.fraud_strictness. Written ONLY by the fraud-eval Edge Function '
  '(service role). No client UPDATE policy (DATA-02 / T-06-02).';

comment on column public.clips.fraud_score is
  'Phase 6: 0-100 fraud severity score computed by fraud-eval (NULL = not yet run). '
  'Higher = more suspicious. Tunable thresholds in future via market_config. '
  'Written ONLY by the fraud-eval Edge Function (service role). No client UPDATE policy.';

-- =============================================================================
-- 2. market_config additive columns — per-market blur + fraud tuning
-- =============================================================================
-- Follows the same pattern as film_fence_max_m / signage_min_conf (0012).
-- CRITICAL — blur_enabled DEFAULT FALSE (D-07 LAUNCH POSTURE):
--   The research draft suggested defaulting to true. CONTEXT.md D-07 and the
--   launch posture require the gate to be DORMANT until on-device blur is
--   visually confirmed on a real device. DEFAULT FALSE means:
--     - face-blur-check evaluates blurEnabled from this column
--     - when false, it returns action='pass' without consulting Vision at all
--     - flipping to true per-market activates the gate for that market only
--   NEVER hard-code blur_enabled in app or Edge Function code — always read
--   from this table. Tunable by ops at any time without a code deploy.
--
-- fraud_strictness DEFAULT 'flag' (D-04):
--   off    — no signal computed; no flag set (fully disabled)
--   flag   — fraud_flag written; no delivery block (DEFAULT, launch posture)
--   hold   — suspicious clips held for manual review before delivery
--   reject — automatic rejection on exceeding threshold (deferred; high FP risk)
--   NEVER hard-code strictness in Edge Function code — always read from this table.
--   CHECK constraint enforces the four legal values (tunable by ops without code deploy).

alter table public.market_config
  add column if not exists blur_enabled boolean not null default false,
  add column if not exists fraud_strictness text not null default 'flag';

-- CHECK constraint on fraud_strictness (idempotent via DO block check on pg_constraint;
-- ADD CONSTRAINT IF NOT EXISTS is PG15+ syntax but Supabase db push rejects it, so we
-- use the conditional DO block pattern from Phase-5 pg_cron migration).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'market_config_fraud_strictness_check'
      and conrelid = 'public.market_config'::regclass
  ) then
    alter table public.market_config
      add constraint market_config_fraud_strictness_check
        check (fraud_strictness in ('off', 'flag', 'hold', 'reject'));
  end if;
end
$$;

comment on column public.market_config.blur_enabled is
  'Phase 6 / D-07: LAUNCH POSTURE — DEFAULT FALSE (gate dormant). '
  'Set to true per market ONLY after on-device face blur is visually confirmed. '
  'face-blur-check reads this value; when false it returns action=''pass'' without '
  'calling Vision API (no performance cost, no false positives at launch). '
  'NEVER hard-code in app or Edge Function code — always read from this table. '
  'Tunable by ops without a code deploy.';

comment on column public.market_config.fraud_strictness is
  'Phase 6 / D-04: fraud detection strictness. Values: '
  '''off'' | ''flag'' (DEFAULT) | ''hold'' | ''reject''. '
  'flag = record fraud signals and set fraud_flag; delivery NOT blocked (launch posture). '
  'hold = suspicious clips held for manual review before delivery (future). '
  'reject = auto-reject on threshold breach (deferred; high false-positive risk). '
  'NEVER hard-code in Edge Function code — fraud-eval reads from this table. '
  'Tunable by ops without a code deploy (CHECK constraint enforces legal values).';

-- =============================================================================
-- 3. check_status enum value 'blur_review'
-- =============================================================================
-- MUST run BEFORE the CREATE OR REPLACE in section 4 (Pitfall 4).
-- ::text comparison in is_valid_check_transition means the function body does NOT
-- resolve enum labels at create-time — so a single-transaction migration is safe.
-- However, ALTER TYPE ... ADD VALUE cannot run inside a transaction in older PG
-- versions; in PG 12+ (Supabase default) this is safe in a migration file.
-- The IF NOT EXISTS guard makes the migration idempotent.

alter type check_status add value if not exists 'blur_review';

-- =============================================================================
-- 4. is_valid_check_transition() CREATE OR REPLACE — add blur_review edges
-- =============================================================================
-- Full 0012 body verbatim (all existing edges preserved exactly) + blur_review
-- edges appended in a new Phase-6 block.
--
-- blur_review ENTRY EDGE — filming -> blur_review:
--   The blur gate (Plan 03 step 6c) fires INSIDE the mux-webhook handler AFTER the
--   clip finalizes and GPS passes, but BEFORE the uploaded/processing/delivered chain
--   runs. At that exact instant the check is still in 'filming' — the webhook has not
--   yet called transition_check('uploaded'). This mirrors the Phase-5 GPS reject which
--   also uses filming -> dispatching (reset_check_for_redispatch, called from the same
--   gate window). So the correct ENTRY edge is:
--       filming -> blur_review
--   NOT 'processing' state (the check is not yet in processing at gate time — gate fires earlier).
--   NOT uploaded -> blur_review (same reason — gate fires before the uploaded step).
--
-- blur_review EXITS:
--   blur_review -> delivered    — ops/service confirms blur applied; delivery resumes
--   blur_review -> dispatching  — held clip re-shot (re-dispatch path, like GPS reject)
--   blur_review -> cancelled    — ops or seeker abandons the held check
--
-- EXISTING EDGES PRESERVED VERBATIM from 0012 (do not alter):
--   requested  -> dispatching | cancelled
--   dispatching -> assigned | cancelled | no_scout | expired
--   assigned    -> filming | cancelled
--   filming     -> uploaded | delivered  (Phase 3 direct path + Phase 6 blur_review entry)
--   uploaded    -> processing
--   processing  -> delivered
--   delivered   -> rated
--   filming/uploaded/processing -> dispatching  (Phase 5 GPS re-dispatch)
--
-- NOTE: 'rejected' is a clips.status value, NOT a check_status value — do NOT add
-- a blur_review -> rejected edge. Only check_status values that exist in the enum
-- may appear here.

create or replace function public.is_valid_check_transition(
  p_from check_status,
  p_to   check_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from::text = 'requested'   and p_to::text in ('dispatching','cancelled')                    then true
    when p_from::text = 'dispatching' and p_to::text in ('assigned','cancelled','no_scout','expired')  then true
    when p_from::text = 'assigned'    and p_to::text in ('filming','cancelled')                        then true
    -- Phase 3: Mux finalize chain + direct filming->delivered for legacy tests.
    when p_from::text = 'filming'     and p_to::text in ('uploaded','delivered')                       then true
    when p_from::text = 'uploaded'    and p_to::text = 'processing'                                    then true
    when p_from::text = 'processing'  and p_to::text = 'delivered'                                     then true
    when p_from::text = 'delivered'   and p_to::text = 'rated'                                          then true
    -- Phase 5: re-dispatch edges for GPS auto-reject (D-05).
    -- When verify-clip rejects a clip's GPS, the check returns to dispatching so a new
    -- Scout can accept. reset_check_for_redispatch() is the only caller of these edges
    -- (service role, auth.uid() IS NULL).
    when p_from::text in ('filming','uploaded','processing') and p_to::text = 'dispatching' then true
    -- Phase 6: blur_review edges (D-03 privacy hold gate).
    -- ENTRY: filming -> blur_review (gate fires before the uploaded/processing chain;
    --   the check is still 'filming' at blur-gate time — see comment above).
    when p_from::text = 'filming'     and p_to::text = 'blur_review'                                   then true
    -- EXITS: ops manual approve (-> delivered), re-dispatch (-> dispatching), or abandon (-> cancelled).
    when p_from::text = 'blur_review' and p_to::text in ('delivered','dispatching','cancelled')         then true
    else false
  end;
$$;

comment on function public.is_valid_check_transition(check_status, check_status) is
  'DATA-02 legal-edge table for the check state machine. Phase 3 added Mux edges. '
  'Phase 5 adds re-dispatch edges: filming/uploaded/processing -> dispatching for GPS '
  'auto-reject (D-05). reset_check_for_redispatch() is the only service-role caller. '
  'Phase 6 adds blur_review edges (D-03): ENTRY filming -> blur_review (gate fires '
  'before the uploaded/processing chain, while check is still filming); '
  'EXITS blur_review -> delivered | dispatching | cancelled. '
  '::text comparison avoids create-time enum-label resolution (ORDERING NOTE).';

-- =============================================================================
-- End of 0014_privacy_fraud_signals.sql
-- DATA-02 confirmed: no new client INSERT/UPDATE/DELETE policy on clips or
-- market_config. blur_status/fraud_signals/fraud_flag/fraud_score are writable
-- only by the service role (face-blur-check and fraud-eval Edge Functions).
-- market_config.blur_enabled and fraud_strictness are readable by authenticated
-- (existing market_config_select_authenticated policy from 0012) but not writable
-- by any client (no new write policy added here).
-- =============================================================================
