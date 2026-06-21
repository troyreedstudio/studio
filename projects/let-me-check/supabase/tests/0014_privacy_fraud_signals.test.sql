-- 0014_privacy_fraud_signals.test.sql — Phase 6 / SCH-01
-- Proves the schema spine that migration 0014_privacy_fraud_signals.sql lays:
--   * clips gets four new columns with correct types and defaults
--   * market_config gets two new tunable columns with launch-posture defaults
--   * 'blur_review' is a valid check_status enum label
--   * is_valid_check_transition correctly allows filming->blur_review (entry)
--     and correctly REJECTS processing->blur_review (wrong entry, D-03 contract)
-- Run with: supabase test db  (pgTAP)
-- RED until 0014_privacy_fraud_signals.sql is pushed live (Plan 04).
-- Style mirrors supabase/tests/clips_mux.test.sql + 0012_geo_spatial.test.sql.

begin;
select plan(14);

-- =============================================================================
-- 1. clips.blur_status — exists, correct default
-- =============================================================================
select has_column(
  'public', 'clips', 'blur_status',
  'clips.blur_status column exists'
);

select col_default_is(
  'public', 'clips', 'blur_status', 'pending',
  'clips.blur_status default is ''pending'''
);

-- =============================================================================
-- 2. clips.fraud_flag — exists, correct default
-- =============================================================================
select has_column(
  'public', 'clips', 'fraud_flag',
  'clips.fraud_flag column exists'
);

select col_default_is(
  'public', 'clips', 'fraud_flag', 'false',
  'clips.fraud_flag default is false'
);

-- =============================================================================
-- 3. clips.fraud_signals — exists (jsonb)
-- =============================================================================
select has_column(
  'public', 'clips', 'fraud_signals',
  'clips.fraud_signals column exists'
);

select col_type_is(
  'public', 'clips', 'fraud_signals', 'jsonb',
  'clips.fraud_signals is of type jsonb'
);

-- =============================================================================
-- 4. clips.fraud_score — exists (smallint)
-- =============================================================================
select has_column(
  'public', 'clips', 'fraud_score',
  'clips.fraud_score column exists'
);

select col_type_is(
  'public', 'clips', 'fraud_score', 'smallint',
  'clips.fraud_score is of type smallint'
);

-- =============================================================================
-- 5. market_config.blur_enabled — exists, launch-posture default is false
-- =============================================================================
select has_column(
  'public', 'market_config', 'blur_enabled',
  'market_config.blur_enabled column exists'
);

select col_default_is(
  'public', 'market_config', 'blur_enabled', 'false',
  'market_config.blur_enabled default is false (D-07 launch posture — gate dormant)'
);

-- =============================================================================
-- 6. market_config.fraud_strictness — exists, default is 'flag'
-- =============================================================================
select has_column(
  'public', 'market_config', 'fraud_strictness',
  'market_config.fraud_strictness column exists'
);

select col_default_is(
  'public', 'market_config', 'fraud_strictness', 'flag',
  'market_config.fraud_strictness default is ''flag'' (D-04 flag-only launch posture)'
);

-- =============================================================================
-- 7. check_status enum — 'blur_review' label exists
-- =============================================================================
select ok(
  exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'check_status'
      and e.enumlabel = 'blur_review'
  ),
  '''blur_review'' is a valid check_status enum label'
);

-- =============================================================================
-- 8. is_valid_check_transition — entry edge: filming -> blur_review is ALLOWED
-- =============================================================================
-- The blur gate fires while the check is still in 'filming' (before the
-- uploaded/processing/delivered chain). This is the critical entry edge (D-03).
select ok(
  public.is_valid_check_transition('filming'::check_status, 'blur_review'::check_status),
  'filming -> blur_review is a valid transition (blur hold entry edge, D-03)'
);

-- =============================================================================
-- 9. is_valid_check_transition — WRONG entry edge: processing -> blur_review REJECTED
-- =============================================================================
-- The check is NOT in 'processing' when the blur gate fires; this edge must be
-- illegal to prevent bypassing the gate ordering (contract pin).
select ok(
  NOT public.is_valid_check_transition('processing'::check_status, 'blur_review'::check_status),
  'processing -> blur_review is NOT a valid transition (gate fires before processing)'
);

select * from finish();
rollback;
